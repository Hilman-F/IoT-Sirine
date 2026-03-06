import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {

apiKey: "APIKEY",
authDomain: "spindo-sirine.firebaseapp.com",
databaseURL: "https://spindo-sirine-default-rtdb.asia-southeast1.firebasedatabase.app",
projectId: "spindo-sirine"

};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);