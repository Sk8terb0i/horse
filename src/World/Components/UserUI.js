import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import * as THREE from "three";

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function createUserUI(db, overlay, horseInstance) {
  const container = document.getElementById("ui-container");
  let rememberMeState = true;

  // Track visibility state
  let herdVisible = !!localStorage.getItem("horse_herd_username");

  // Normalize inputs across mobile devices and fix layout clipping
  const styleEl = document.createElement("style");
  styleEl.id = "dc-user-ui-overrides";
  styleEl.innerHTML = `
    #ui-container {
      max-height: 85vh !important;
      overflow-y: auto !important;
      display: flex !important;
      flex-direction: column !important;
      box-sizing: border-box !important;
    }
    #input-fields {
      display: flex !important;
      flex-direction: column !important;
      width: 100% !important;
    }
    #input-fields input[type="text"],
    #input-fields input[type="password"] {
      background: rgba(255, 255, 255, 0.1) !important;
      color: #fff !important;
      border: 1px solid rgba(255, 255, 255, 0.2) !important;
      padding: 12px !important;
      margin-bottom: 12px !important;
      border-radius: 8px !important;
      /* 16px font size completely prevents iOS Safari from force-zooming and cutting off top fields */
      font-size: 16px !important; 
      font-family: inherit !important;
      box-sizing: border-box !important;
      width: 100% !important;
    }
    #input-fields input::placeholder {
      color: rgba(255, 255, 255, 0.4) !important;
    }
  `;
  document.head.appendChild(styleEl);

  const toggleHerdVisibility = (visible) => {
    herdVisible = visible;
    if (horseInstance && horseInstance.activeSpheres) {
      horseInstance.activeSpheres.forEach((s) => {
        if (s.username !== "big horse") {
          s.mesh.visible = visible;
        }
      });
    }
  };

  const savedUsername = localStorage.getItem("horse_herd_username");
  if (savedUsername) {
    showAscendedState();
  } else {
    renderLoginForm();
  }

  function renderJoinForm() {
    container.innerHTML = `
      <div id="ui-header">unite with horse; become a point of connection</div>
      <div id="input-fields">
        <input type="text" id="nameInput" placeholder="your name" autocomplete="name" />
        <input type="text" id="usernameInput" placeholder="unique username" autocomplete="username" />
        <input type="password" id="passwordInput" placeholder="choose a password" autocomplete="new-password" />
      </div>
      <div id="remember-toggle" style="font-size: 10px; opacity: 0.4; cursor: pointer; margin-bottom: 10px;">
        [ x ] remember my connection
      </div>
      <button id="submitBtn">join horse</button>
      <div id="toggle-ui">i'm part of the herd</div>
      <p id="msg"></p>
    `;
    attachListeners(false);
  }

  function renderLoginForm() {
    container.innerHTML = `
      <div id="ui-header">welcome back to the marrow</div>
      <div id="input-fields">
        <input type="text" id="usernameInput" placeholder="your username" autocomplete="username" />
        <input type="password" id="passwordInput" placeholder="your password" autocomplete="current-password" />
      </div>
      <div id="remember-toggle" style="font-size: 10px; opacity: 0.4; cursor: pointer; margin-bottom: 10px;">
        [ x ] remember my connection
      </div>
      <button id="submitBtn">reunite</button>
      <div id="toggle-ui">i need to join</div>
      <p id="msg"></p>
    `;
    attachListeners(true);
  }

  function attachListeners(isLogin) {
    const submitBtn = document.getElementById("submitBtn");
    const toggleBtn = document.getElementById("toggle-ui");
    const rememberToggle = document.getElementById("remember-toggle");
    const msg = document.getElementById("msg");
    const inputs = container.querySelectorAll("input");
    const originalBtnText = submitBtn.innerText;

    rememberToggle.onclick = () => {
      rememberMeState = !rememberMeState;
      rememberToggle.innerText = rememberMeState
        ? "[ x ] remember my connection"
        : "[   ] remember my connection";
      rememberToggle.style.opacity = rememberMeState ? "0.4" : "0.2";
    };

    const setButtonsLoading = (isLoading) => {
      if (isLoading) {
        submitBtn.innerText = "galloping..";
        submitBtn.style.opacity = "0.5";
        submitBtn.style.pointerEvents = "none";
      } else {
        submitBtn.innerText = originalBtnText;
        submitBtn.style.opacity = "1";
        submitBtn.style.pointerEvents = "auto";
      }
    };

    inputs.forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") submitBtn.click();
      });
    });

    toggleBtn.addEventListener("click", () => {
      isLogin ? renderJoinForm() : renderLoginForm();
    });

    submitBtn.addEventListener("click", async () => {
      const usernameInput = document.getElementById("usernameInput");
      const passwordInput = document.getElementById("passwordInput");
      const username = usernameInput.value.trim().toLowerCase();
      const password = passwordInput.value.trim();

      if (!username || !password) {
        msg.innerText = "the horse requires both name and password.";
        return;
      }

      setButtonsLoading(true);
      msg.innerText = "";

      const auth = getAuth();
      const pseudoEmail = `${username}@horse.herd`;

      try {
        const userRef = doc(db, "users", username);

        if (isLogin) {
          try {
            await signInWithEmailAndPassword(auth, pseudoEmail, password);
            loginUser(username, rememberMeState);
          } catch (authError) {
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.data();
              const enteredHash = await hashPassword(password);

              if (
                userData.password === enteredHash ||
                userData.password === password
              ) {
                await createUserWithEmailAndPassword(
                  auth,
                  pseudoEmail,
                  password,
                );
                await updateDoc(userRef, { password: deleteField() });
                loginUser(username, rememberMeState);
              } else {
                msg.innerText = "the password does not match the marrow.";
                setButtonsLoading(false);
              }
            } else {
              msg.innerText = "username not found in herd.";
              setButtonsLoading(false);
            }
          }
        } else {
          const nameInput = document.getElementById("nameInput");
          const name = nameInput.value.trim();

          if (!name) {
            msg.innerText = "please provide your name.";
            setButtonsLoading(false);
            return;
          }

          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            msg.innerText = "username already taken.";
            setButtonsLoading(false);
            return;
          }

          try {
            await createUserWithEmailAndPassword(auth, pseudoEmail, password);

            const color = new THREE.Color().setHSL(Math.random(), 0.4, 0.7);
            await setDoc(userRef, {
              realName: name,
              username: username,
              innerColor: `#${color.getHexString()}`,
              createdAt: Date.now(),
            });

            loginUser(username, rememberMeState);
          } catch (createErr) {
            msg.innerText = "failed to create connection.";
            console.error(createErr);
            setButtonsLoading(false);
          }
        }
      } catch (e) {
        console.error(e);
        msg.innerText = "database error.";
        setButtonsLoading(false);
      }
    });
  }

  function loginUser(username, shouldRemember) {
    if (shouldRemember) localStorage.setItem("horse_herd_username", username);
    else sessionStorage.setItem("horse_herd_username", username);

    if (overlay) {
      overlay.showMainUI();
      overlay.setUsername(username);
      window.location.reload();
    }
    showAscendedState();
  }

  function showAscendedState() {
    container.style.display = "none";
    toggleHerdVisibility(true);
  }

  return { isHerdVisible: () => herdVisible };
}
