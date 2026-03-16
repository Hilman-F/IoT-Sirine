// ---------------------------
// IMPORT FIREBASE
// ---------------------------
import { db } from "./firebase.js";
import {
    ref,
    onValue,
    update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ---------------------------
// ELEMENTS
// ---------------------------
const container = document.getElementById("scheduleContainer");
const timeline = document.getElementById("timeline");


// ---------------------------
// CONSTANTS
// ---------------------------
const engines = [
    "Masuk",
    "MasukSabtu",
    "IstirahatMulai",
    "IstirahatMulaiJumat",
    "IstirahatMulaiSabtu",
    "IstirahatSelesai",
    "IstirahatSelesaiJumat",
    "IstirahatSelesaiSabtu",
    "Pulang",
    "PulangJumat",
    "PulangSabtu"
];

const engineMap = {
    Masuk: "Masuk",
    MasukSabtu: "Masuk",
    IstirahatMulai: "Istirahat Mulai",
    IstirahatMulaiJumat: "Istirahat Mulai",
    IstirahatMulaiSabtu: "Istirahat Mulai",
    IstirahatSelesai: "Istirahat Selesai",
    IstirahatSelesaiJumat: "Istirahat Selesai",
    IstirahatSelesaiSabtu: "Istirahat Selesai",
    Pulang: "Pulang",
    PulangJumat: "Pulang",
    PulangSabtu: "Pulang"
};

const hariList = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

// ---------------------------
// STATE
// ---------------------------
let openShift = null;
let nextEventGlobal = null;
let countdownInterval = null;




// ---------------------------
// FIREBASE LISTENER
// ---------------------------
onValue(ref(db,"Schedule"), snapshot => {
    if(!container) return;
    const data = snapshot.val();
    if(!data) return;

    window._scheduleCache = data;

    renderSchedule(data);
    renderTimeline(data);
});

// ---------------------------
// RENDER SCHEDULE (LEFT PANEL)
// ---------------------------
function renderSchedule(data){
    let htmlAll = "";
    Object.keys(data).forEach(shift=>{
        const s = data[shift];

        let contentHidden = openShift===shift ? "" : "hidden";
        let arrowRotate = openShift===shift ? "rotate-90" : "";

        let html = `
        <div class="bg-slate-800 p-5 rounded-xl transition-all duration-300">
            <div class="flex justify-between items-center">
                <div class="flex items-center gap-3 cursor-pointer" onclick="toggleShift('${shift}')">
                    <span id="arrow-${shift}" class="transition-transform duration-300 ${arrowRotate}">
                        ▼
                    </span>
                    <h2 class="text-xl font-bold">${shift}</h2>
                </div>
                <select onchange="updateStatus('${shift}',this.value)" class="bg-slate-700 p-2 rounded">
                    <option ${s.Status==="Active"?"selected":""}>Active</option>
                    <option ${s.Status==="InActive"?"selected":""}>InActive</option>
                </select>
            </div>
            <div id="shiftContent-${shift}" class="mt-4 ${contentHidden}">
        `;

        engines.forEach(engine=>{
            const e = s[engine] || {Jam:0,Menit:0,Hari:[false,false,false,false,false,false,false]};
            html += `
            <div class="mt-6 border-t border-slate-700 pt-4">
                <h3 class="font-semibold mb-2">${engine}</h3>
                <div class="flex gap-2 mb-3">
                    <input type="number" min="0" max="23" value="${e.Jam}" class="bg-slate-700 p-2 rounded w-20"
                        onchange="updateTime('${shift}','${engine}','Jam',this.value)">
                    <input type="number" min="0" max="59" value="${e.Menit}" class="bg-slate-700 p-2 rounded w-20"
                        onchange="updateTime('${shift}','${engine}','Menit',this.value)">
                </div>
                <div class="flex flex-wrap gap-2">
            `;
            for(let i=0;i<7;i++){
                const active = e.Hari?.[i] ?? false;
                html += `
                <button onclick="toggleDay('${shift}','${engine}',${i},${active})"
                    class="px-3 py-1 rounded-full text-sm ${active?"bg-blue-600":"bg-slate-700"}">
                    ${hariList[i]}
                </button>`;
            }
            html += `</div></div>`;
        });

        html += `</div></div>`;
        htmlAll += html;
    });
    container.innerHTML = htmlAll;
}

// ---------------------------
// RENDER TIMELINE (RIGHT PANEL)
// ---------------------------
function renderTimeline(schedule){

    if(!timeline) return;

    const now = new Date();
    const day = now.getDay();

    let allEvents = [];
    let shiftEvents = {};

    // =========================
    // BUILD EVENTS
    // =========================
    Object.keys(schedule).forEach(shift=>{

        const s = schedule[shift];
        if(s.Status !== "Active") return;

        shiftEvents[shift] = [];

        engines.forEach(engine=>{

            const e = s[engine];
            if(!e) return;
            if(!e.Hari?.[day]) return;

            const time = new Date();
            time.setHours(e.Jam,e.Menit,0,0);

            const eventObj = {
                shift,
                engine,
                jam:e.Jam,
                menit:e.Menit,
                time
            };

            shiftEvents[shift].push(eventObj);
            allEvents.push(eventObj);

        });

    });

    if(allEvents.length === 0){
        timeline.innerHTML = "Tidak ada jadwal aktif";
        return;
    }

    // =========================
    // FIND NEXT EVENT GLOBAL
    // =========================
    let nextEvent = null;

    allEvents.forEach(e=>{
        if(e.time > now){
            if(!nextEvent || e.time < nextEvent.time){
                nextEvent = e;
            }
        }
    });

    // jika semua event hari ini sudah lewat
    if(!nextEvent){

        allEvents.forEach(e=>{

            const tomorrow = new Date(e.time);
            tomorrow.setDate(tomorrow.getDate()+1);

            if(!nextEvent || tomorrow < nextEvent.time){
                nextEvent = {...e,time:tomorrow};
            }

        });

    }

    nextEventGlobal = nextEvent;

    // =========================
    // RENDER SHIFT
    // =========================
    let htmlAll = "";

    Object.keys(shiftEvents).forEach(shift=>{

        const events = shiftEvents[shift];

        events.sort((a,b)=>a.time-b.time);

        htmlAll += `
        <div class="bg-slate-800 p-4 rounded-xl mb-3">
        <h3 class="font-bold text-lg mb-2">${shift}</h3>
        `;

        events.forEach(e=>{

            const isNext =
                nextEvent &&
                e.shift === nextEvent.shift &&
                e.engine === nextEvent.engine;

            htmlAll += `
            <div class="
                flex justify-between py-1 px-2 rounded
                ${isNext ? "bg-yellow-400 text-black font-bold" : ""}
            ">
                <div>${engineMap[e.engine] || e.engine}</div>
                <div>
                    ${String(e.jam).padStart(2,"0")}:
                    ${String(e.menit).padStart(2,"0")}
                    ${isNext ? `<span id="countdownTimer"></span>` : ""}
                </div>
            </div>
            `;

        });

        htmlAll += `</div>`;

    });

    timeline.innerHTML = htmlAll;

    startCountdown();

}

// ---------------------------
// FUNGSI COUNTDOWN
// ---------------------------
function startCountdown(){

    if(countdownInterval){
        clearInterval(countdownInterval);
    }

    countdownInterval = setInterval(()=>{

        if(!nextEventGlobal) return;

        const now = new Date();

        let diff = Math.floor((nextEventGlobal.time - now)/1000);

        // jika event sudah lewat -> hitung ulang timeline
        if(diff <= 0){

            clearInterval(countdownInterval);

            const schedule = window._scheduleCache;
            if(schedule){
                renderTimeline(schedule);
            }

            return;
        }

        const h = String(Math.floor(diff/3600)).padStart(2,"0");
        const m = String(Math.floor((diff%3600)/60)).padStart(2,"0");
        const s = String(diff%60).padStart(2,"0");

        const el = document.getElementById("countdownTimer");

        if(el){
            el.innerText = ` ⏱ ${h}:${m}:${s}`;
        }

    },1000);

}

// ---------------------------
// WINDOW FUNCTIONS (GLOBAL)
// ---------------------------
window.updateStatus = (shift,val)=>{
    update(ref(db,"Schedule/"+shift),{Status:val});
}

window.updateTime = (shift,engine,field,val)=>{
    update(ref(db,`Schedule/${shift}/${engine}`),{[field]:Number(val)});
}

window.toggleDay = (shift,engine,day,current)=>{
    update(ref(db,`Schedule/${shift}/${engine}/Hari`),{[day]:!current});
}

window.toggleShift = (shift)=>{
    const content = document.getElementById(`shiftContent-${shift}`);
    const arrow = document.getElementById(`arrow-${shift}`);
    if(!content) return;

    const isHidden = content.classList.contains("hidden");

    // collapse all
    document.querySelectorAll("[id^='shiftContent-']").forEach(el=>el.classList.add("hidden"));
    document.querySelectorAll("[id^='arrow-']").forEach(el=>el.classList.remove("rotate-90"));

    if(isHidden){
        content.classList.remove("hidden");
        if(arrow) arrow.classList.add("rotate-90");
        openShift = shift;
    }else{
        openShift = null;
    }
}
