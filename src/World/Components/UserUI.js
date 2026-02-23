import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import * as THREE from "three";

/**
 * creates a secure sha-256 hash of a password string.
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function createUserUI(db, overlay) {
  const container = document.getElementById("ui-container");

  const savedUsername = localStorage.getItem("horse_herd_username");
  if (savedUsername) {
    showAscendedState();
    return;
  }

  renderJoinForm();

  function renderJoinForm() {
    container.innerHTML = `
      <div id="ui-header">unite with horse; become a point of connection</div>
      <div id="input-fields">
        <input type="text" id="nameInput" placeholder="your name" />
        <input type="text" id="usernameInput" placeholder="unique username" />
        <input type="password" id="passwordInput" placeholder="choose a password" />
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
      <button id="submitBtn">reunite</button>
      <div id="toggle-ui">i need to join</div>
      <p id="msg"></p>
    `;

    const usernameInput = container.querySelector("#usernameInput");
    const passwordInput = container.querySelector("#passwordInput");
    const uiHeader = container.querySelector("#ui-header");

    // check for legacy (unclaimed) users on the fly
    usernameInput.addEventListener("blur", async () => {
      const username = usernameInput.value.trim().toLowerCase();
      if (!username) return;

      const userRef = doc(db, "users", username);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists() && !userSnap.data().password) {
        uiHeader.innerText =
          "this soul is unclaimed. set a password to secure your place.";
        passwordInput.placeholder = "set your new password";
        uiHeader.style.color = "var(--big-horse-color)";
      }
    });

    attachListeners(true);
  }

  function attachListeners(isLogin) {
    const submitBtn = document.getElementById("submitBtn");
    const toggleBtn = document.getElementById("toggle-ui");
    const msg = document.getElementById("msg");
    const inputs = container.querySelectorAll("input");

    const originalBtnText = submitBtn.innerText;

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
        if (e.key === "Enter") {
          submitBtn.click();
        }
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

      try {
        const enteredHash = await hashPassword(password);
        const userRef = doc(db, "users", username);
        const userSnap = await getDoc(userRef);

        if (isLogin) {
          if (userSnap.exists()) {
            const userData = userSnap.data();

            // 1. legacy user: no password exists yet
            if (!userData.password) {
              await updateDoc(userRef, { password: enteredHash });
              loginUser(username);
            }
            // 2. secure user: matches existing hash
            else if (userData.password === enteredHash) {
              loginUser(username);
            }
            // 3. migration case: matches plain-text password, needs upgrade to hash
            else if (userData.password === password) {
              await updateDoc(userRef, { password: enteredHash });
              loginUser(username);
            }
            // 4. wrong password
            else {
              msg.innerText = "the password does not match the marrow.";
              setButtonsLoading(false);
            }
          } else {
            msg.innerText = "username not found in herd.";
            setButtonsLoading(false);
          }
        } else {
          // registration logic
          const nameInput = document.getElementById("nameInput");
          const name = nameInput.value.trim();

          if (!name) {
            msg.innerText = "please provide your name.";
            setButtonsLoading(false);
            return;
          }

          if (userSnap.exists()) {
            msg.innerText = "username already taken.";
            setButtonsLoading(false);
          } else {
            const color = new THREE.Color().setHSL(Math.random(), 0.4, 0.7);
            const hexColor = `#${color.getHexString()}`;

            await setDoc(userRef, {
              realName: name,
              username: username,
              password: enteredHash,
              innerColor: hexColor,
              createdAt: Date.now(),
            });

            loginUser(username);
          }
        }
      } catch (e) {
        console.error("firebase error:", e);
        msg.innerText = "database error.";
        setButtonsLoading(false);
      }
    });
  }

  function loginUser(username) {
    localStorage.setItem("horse_herd_username", username);
    if (overlay) {
      overlay.showMainUI();
      overlay.setUsername(username);
      window.location.reload();
    }
    showAscendedState();
  }

  function showAscendedState() {
    container.style.display = "none";
  }
}
