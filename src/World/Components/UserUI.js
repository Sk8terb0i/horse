import { doc, getDoc, setDoc } from "firebase/firestore";
import * as THREE from "three";

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
      const username = usernameInput.value.trim().toLowerCase();

      if (!username) return;

      // check for name field if joining
      if (!isLogin) {
        const nameInput = document.getElementById("nameInput");
        if (!nameInput.value.trim()) return;
      }

      setButtonsLoading(true);
      msg.innerText = "";

      try {
        const userRef = doc(db, "users", username);
        const userSnap = await getDoc(userRef);

        if (isLogin) {
          if (userSnap.exists()) {
            loginUser(username);
          } else {
            msg.innerText = "username not found in herd.";
            setButtonsLoading(false);
          }
        } else {
          const nameInput = document.getElementById("nameInput");
          const name = nameInput.value.trim();

          if (userSnap.exists()) {
            msg.innerText = "username already taken.";
            setButtonsLoading(false);
          } else {
            const color = new THREE.Color().setHSL(Math.random(), 0.4, 0.7);
            const hexColor = `#${color.getHexString()}`;

            await setDoc(userRef, {
              realName: name,
              username: username,
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
