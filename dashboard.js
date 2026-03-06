import { db } from "./firebase.js";

import {
ref,
onValue,
set
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const modeSelect = document.getElementById("modeSelect");
const btnOn = document.getElementById("btnOn");
const btnOff = document.getElementById("btnOff");

const relayStatus = document.getElementById("relayStatus");
const currentTime = document.getElementById("currentTime");

const espStatus = document.getElementById("espStatus");

const nextEvent = document.getElementById("nextEvent");
const countdown = document.getElementById("countdown");

let scheduleCache = null;
let nextEventTime = null;

const engines = [
"Masuk",
"IstirahatMulai",
"IstirahatMulaiJumat",
"IstirahatSelesai",
"IstirahatSelesaiJumat",
"Pulang",
"PulangJumat"
];


// ================= ESP32 STATUS =================

onValue(ref(db,"currentTime"),snap=>{

const timeStr = snap.val();
if(!timeStr) return;

const now = new Date();
const last = new Date(timeStr.replace(" ","T"));

const diff = (now-last)/1000;

espStatus.innerText = diff < 20 ? "ONLINE" : "OFFLINE";
espStatus.className = diff < 20
? "value text-green-400"
: "value text-red-500";

currentTime.innerText =
last.toLocaleString("id-ID",{
weekday:"long",
year:"numeric",
month:"long",
day:"numeric",
hour:"2-digit",
minute:"2-digit",
second:"2-digit"
});

if(scheduleCache){
updateNextSirene(scheduleCache,last);
}

});


// ================= MODE =================

onValue(ref(db,"Mode"),snap=>{

const mode = snap.val();

modeSelect.value = mode;

btnOn.disabled = mode !== "Manual";
btnOff.disabled = mode !== "Manual";

});

modeSelect.onchange=()=>{
set(ref(db,"Mode"),modeSelect.value);
};



// ================= RELAY =================

onValue(ref(db,"relayManual"),snap=>{
relayStatus.innerText = snap.val() ? "ON" : "OFF";
});

btnOn.onclick=()=>set(ref(db,"relayManual"),true);
btnOff.onclick=()=>set(ref(db,"relayManual"),false);



// ================= SCHEDULE =================

onValue(ref(db,"Schedule"),snap=>{
scheduleCache = snap.val();
});



// ================= NEXT SIRENE =================

function updateNextSirene(schedule,now){

const day = now.getDay();

let nearest = null;

Object.keys(schedule).forEach(shift=>{

const s = schedule[shift];
if(s.Status !== "Active") return;

engines.forEach(engine=>{

const e = s[engine];
if(!e) return;

if(!e.Hari?.[day]) return;

const eventTime = new Date(now);

eventTime.setHours(e.Jam);
eventTime.setMinutes(e.Menit);
eventTime.setSeconds(0);

if(eventTime <= now) return;

if(!nearest || eventTime < nearest.time){

nearest={
shift,
engine,
time:eventTime
};

}

});

});

if(!nearest){

nextEvent.innerText="Tidak ada jadwal";
nextEventTime=null;
return;

}

nextEvent.innerText = `${nearest.engine} ${nearest.shift}`;

nextEventTime = nearest.time;

}



// ================= COUNTDOWN =================

setInterval(()=>{

if(!nextEventTime) return;

const now = new Date();

let diff = Math.floor((nextEventTime-now)/1000);

if(diff<0) diff=0;

const h = String(Math.floor(diff/3600)).padStart(2,"0");
const m = String(Math.floor((diff%3600)/60)).padStart(2,"0");
const s = String(diff%60).padStart(2,"0");

countdown.innerText=`${h}:${m}:${s}`;

},1000);