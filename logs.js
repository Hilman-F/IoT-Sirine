import { db } from "./firebase.js";

import {
ref,
onValue,
push
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";


const container = document.getElementById("logContainer");

let prevState = false;

onValue(ref(db,"relayAuto"),snap=>{

const state = snap.val();

if(state === true && prevState === false){

createLog();

}

prevState = state;

});


function createLog(){

const now = new Date();

push(ref(db,"logs"),{

time: now.toISOString(),
status: "SUCCESS"

});

}



onValue(ref(db,"logs"),snap=>{

    const logs = snap.val();
    
    container.innerHTML="";
    
    let grouped = {};
    
    Object.values(logs).forEach(log=>{
    
    if(!grouped[log.shift])
    grouped[log.shift]=[];
    
    grouped[log.shift].push(log);
    
    });
    
    
    Object.keys(grouped).forEach(shift=>{
    
    container.innerHTML+=`
    
    <div class="bg-slate-800 p-4 rounded-xl mb-4">
    
    <h3 class="font-bold mb-2">${shift}</h3>
    
    `;
    
    grouped[shift].forEach(log=>{
    
    container.innerHTML+=`
    
    <div class="flex justify-between py-1">
    
    <div>
    
    ${log.event}
    
    </div>
    
    <div>
    
    ${log.time}
    
    </div>
    
    <div class="text-green-400">
    
    ${log.status}
    
    </div>
    
    </div>
    
    `;
    
    });
    
    container.innerHTML+=`</div>`;
    
    });
    
    });