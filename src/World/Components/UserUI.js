import { doc, getDoc, setDoc } from "firebase/firestore";

export function createUserUI(db) {
  const container = document.getElementById("ui-container");

  // Check if user is already remembered
  const savedUsername = localStorage.getItem("horse_herd_username");
  if (savedUsername) {
    showAscendedState();
    return;
  }

  renderJoinForm();

  function renderJoinForm() {
    container.innerHTML = `
      <div id="ui-header">unite with horse become a point of connection</div>
      <div id="input-fields">
        <input type="text" id="nameInput" placeholder="your name" />
        <input type="text" id="usernameInput" placeholder="unique username" />
      </div>
      <button id="submitBtn">join horse</button>
      <div id="toggle-ui">I'm part of the herd</div>
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
      <div id="toggle-ui">I need to join</div>
      <p id="msg"></p>
    `;
    attachListeners(true);
  }

  function attachListeners(isLogin) {
    const submitBtn = document.getElementById("submitBtn");
    const toggleBtn = document.getElementById("toggle-ui");
    const msg = document.getElementById("msg");

    toggleBtn.addEventListener("click", () => {
      isLogin ? renderJoinForm() : renderLoginForm();
    });

    submitBtn.addEventListener("click", async () => {
      const username = document
        .getElementById("usernameInput")
        .value.trim()
        .toLowerCase();
      if (!username) return;

      try {
        const userRef = doc(db, "users", username);
        const userSnap = await getDoc(userRef);

        if (isLogin) {
          if (userSnap.exists()) {
            loginUser(username);
          } else {
            msg.innerText = "username not found in herd.";
          }
        } else {
          const name = document.getElementById("nameInput").value.trim();
          if (!name) return;
          if (userSnap.exists()) {
            msg.innerText = "username already taken.";
          } else {
            await setDoc(userRef, {
              realName: name,
              username,
              createdAt: Date.now(),
            });
            loginUser(username);
          }
        }
      } catch (e) {
        console.error(e);
        msg.innerText = "database error.";
      }
    });
  }

  function loginUser(username) {
    localStorage.setItem("horse_herd_username", username);
    showAscendedState();
  }

  function showAscendedState() {
    container.style.display = "none";
    const icon = document.getElementById("manifesto-icon");
    if (icon) icon.classList.add("visible");
  }
}
