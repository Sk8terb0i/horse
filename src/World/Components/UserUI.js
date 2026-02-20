import { doc, getDoc, setDoc } from "firebase/firestore";

export function createUserUI(db) {
  const container = document.getElementById("ui-container");

  container.innerHTML = `
    <div id="ui-header">unite with horse become a point of connection</div>
    <input type="text" id="nameInput" placeholder="your name" />
    <input type="text" id="usernameInput" placeholder="unique username" />
    <button id="submitBtn">join horse</button>
    <p id="msg"></p>
  `;

  const nameInput = document.getElementById("nameInput");
  const usernameInput = document.getElementById("usernameInput");
  const submitBtn = document.getElementById("submitBtn");
  const msg = document.getElementById("msg");

  submitBtn.addEventListener("click", async () => {
    const name = nameInput.value.trim();
    const username = usernameInput.value.trim().toLowerCase();

    if (!name || !username) {
      updateMessage("please fill in both fields.", "error");
      return;
    }

    try {
      const userRef = doc(db, "users", username);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        updateMessage("username already taken!", "error");
      } else {
        await setDoc(userRef, {
          realName: name,
          username: username,
          createdAt: Date.now(),
        });

        updateMessage("success! you are horse.", "success");

        // REVEAL MANIFESTO ICON ON JOIN
        const icon = document.getElementById("manifesto-icon");
        if (icon) icon.classList.add("visible");

        nameInput.value = "";
        usernameInput.value = "";
      }
    } catch (err) {
      console.error(err);
      updateMessage("database error.", "error");
    }
  });

  function updateMessage(text, type) {
    msg.innerText = text;
    msg.className = type;
  }
}
