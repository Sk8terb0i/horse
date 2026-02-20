import { doc, getDoc, setDoc } from "firebase/firestore";

export function createUserUI(db) {
  const container = document.getElementById("ui-container");

  // Create HTML structure dynamically
  container.innerHTML = `
    <input type="text" id="nameInput" placeholder="Your Name" />
    <input type="text" id="usernameInput" placeholder="Unique Username" />
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
      updateMessage("Please fill in both fields.", "error");
      return;
    }

    try {
      const userRef = doc(db, "users", username);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        updateMessage("Username already taken!", "error");
      } else {
        await setDoc(userRef, {
          realName: name,
          username: username,
          createdAt: Date.now(),
        });

        updateMessage("Success! You've joined.", "success");
        nameInput.value = "";
        usernameInput.value = "";
      }
    } catch (err) {
      console.error(err);
      updateMessage("Database error.", "error");
    }
  });

  function updateMessage(text, type) {
    msg.innerText = text;
    msg.className = type;
  }
}
