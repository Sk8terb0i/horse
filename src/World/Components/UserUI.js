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

  const toggleHerdVisibility = (visible) => {
    herdVisible = visible;
    if (horseInstance && horseInstance.activeSpheres) {
      horseInstance.activeSpheres.forEach((s) => {
        if (s.username !== "big horse") {
          s.mesh.visible = visible;
          // no need to manually toggle label.element.style.display
          // because Horse.js update() now handles s.label.visible
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
        <input type="text" id="nameInput" placeholder="your name" />
        <input type="text" id="usernameInput" placeholder="unique username" />
        <input type="password" id="passwordInput" placeholder="choose a password" />
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
        <input type="text" id="usernameInput" placeholder="your username" />
        <input type="password" id="passwordInput" placeholder="your password" />
      </div>
      <div id="remember-toggle" style="font-size: 10px; opacity: 0.4; cursor: pointer; margin-bottom: 10px;">
        [ x ] remember my connection
      </div>
      <button id="submitBtn">reunite</button>
      <div id="toggle-ui">i need to join</div>
      <p id="msg"></p>
    `;

    const usernameInput = container.querySelector("#usernameInput");
    const passwordInput = container.querySelector("#passwordInput");
    const uiHeader = container.querySelector("#ui-header");

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
      // Create a fake email behind the scenes for Firebase Auth
      const pseudoEmail = `${username}@horse.herd`;

      try {
        const userRef = doc(db, "users", username);

        if (isLogin) {
          try {
            // 1. Try modern Firebase Auth first
            await signInWithEmailAndPassword(auth, pseudoEmail, password);
            loginUser(username, rememberMeState);
          } catch (authError) {
            // 2. MIGRATION FALLBACK: If Auth fails, check the old database
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
              const userData = userSnap.data();
              const enteredHash = await hashPassword(password);

              // Verify the old password system
              if (
                userData.password === enteredHash ||
                userData.password === password
              ) {
                // Success! Create their new secure Auth account
                await createUserWithEmailAndPassword(
                  auth,
                  pseudoEmail,
                  password,
                );

                // Optional: Delete the exposed password hash from the database
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
          // REGISTRATION: Brand new users
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
            // Create Firebase Auth user
            await createUserWithEmailAndPassword(auth, pseudoEmail, password);

            // Create database entry (WITHOUT saving the password!)
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

  // Return the state for main.js to use
  return { isHerdVisible: () => herdVisible };
}
