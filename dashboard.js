// ---------------------------
// IMPORT FIREBASE
// ---------------------------
import { db } from "./firebase.js";
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// ---------------------------
// ELEMENTS
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {

    const modeSelect = document.getElementById("modeSelect");
    const btnOn = document.getElementById("btnOn");
    const btnOff = document.getElementById("btnOff");

    const relayStatus = document.getElementById("relayStatus");
    const relayAutoStatus = document.getElementById("relayAutoStatus");
    const relayManual = document.getElementById("relayManual");
    const relayAuto = document.getElementById("relayAuto");
    const manualControl = document.getElementById("manualControl");

    const updateTime = document.getElementById("updateTime");
    const currentTimeEl = document.getElementById("currentTime");
    const espStatus = document.getElementById("espStatus");

    const autoTimer = document.getElementById("autoTimer");
    const nextEvent = document.getElementById("nextEvent");
    const countdown = document.getElementById("countdown");

    let scheduleCache = null;
    let nextEventTime = null;

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

    function mapEngineName(engine){
        return engineMap[engine] || engine;
    }

    // ================= ESP32 STATUS =================
    onValue(ref(db, "updateTime"), snap => {
    const timeStr = snap.val();
    if (!timeStr) return;

    // 1. Persiapan Tanggal
    const now = new Date();
    const last = new Date(timeStr.replace(" ", "T"));
    
    // 2. Menghitung selisih waktu dengan aman
    const diff = (now.getTime() - last.getTime()) / 1000;
    const isOnline = diff < 20;

    // 3. Memperbarui UI Status
    espStatus.innerText = isOnline ? "ONLINE" : "OFFLINE";
    espStatus.className = isOnline ? "value text-green-400" : "value text-red-500";

    // 4. Memformat Tanggal & Waktu berdasarkan 'last' (waktu update ESP), BUKAN 'now'
    const date = last.toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
    });

    const time = [
        last.getHours(),
        last.getMinutes(),
        last.getSeconds()
    ].map(n => String(n).padStart(2, "0")).join(":");

    updateTime.innerText = `${date} - ${time} WIB`;

    // 5. Memicu pembaruan jadwal sirene
    if (scheduleCache) {
        // Asumsinya updateNextSirene membutuhkan waktu saat ini (now) untuk mengecek apakah sirene harus berbunyi
        updateNextSirene(scheduleCache, now); 
    }
});

    // ================= MODE =================
    onValue(ref(db,"Mode"), snap => {

        const mode = snap.val();
        modeSelect.value = mode;

        btnOn.disabled = mode !== "Manual";
        btnOff.disabled = mode !== "Manual";

        if(mode === "Auto"){
            relayManual.classList.add("hidden");
            manualControl.classList.add("hidden");
            relayAuto.classList.remove("hidden");
            autoTimer.classList.remove("hidden");
            set(ref(db,"relayManual"),false);
        }
        else{
            relayAuto.classList.add("hidden");
            autoTimer.classList.add("hidden");
            relayManual.classList.remove("hidden");
            manualControl.classList.remove("hidden");
        }

    });

    modeSelect.onchange = () => set(ref(db,"Mode"),modeSelect.value);

    // ================= RELAY =================
    onValue(ref(db,"relayManual"), snap =>
        relayStatus.innerText = snap.val() ? "ON" : "OFF"
    );

    onValue(ref(db,"relayAuto"), snap =>
        relayAutoStatus.innerText = snap.val() ? "ON" : "OFF"
    );

    btnOn.onclick = () => set(ref(db,"relayManual"),true);
    btnOff.onclick = () => set(ref(db,"relayManual"),false);

    // ================= SCHEDULE =================
    onValue(ref(db,"Schedule"), snap => {

        scheduleCache = snap.val();

        if(scheduleCache){
            updateNextSirene(scheduleCache,new Date());
        }

    });

    // ================= NEXT SIRENE =================
    function updateNextSirene(schedule, now){

        const day = now.getDay();

        let nearest = null;
        let nearestTomorrow = null;

        Object.keys(schedule).forEach(shift => {

            const s = schedule[shift];
            if(s.Status !== "Active") return;

            engines.forEach(engine => {

                const e = s[engine];
                if(!e) return;
                if(!e.Hari?.[day]) return;

                const eventTime = new Date(now);
                eventTime.setHours(e.Jam,e.Menit,0,0);

                if(eventTime > now){

                    if(!nearest || eventTime < nearest.time){
                        nearest = {shift,engine,time:eventTime};
                    }

                    return;
                }

                const tomorrow = new Date(eventTime);
                tomorrow.setDate(tomorrow.getDate()+1);

                if(!nearestTomorrow || tomorrow < nearestTomorrow.time){
                    nearestTomorrow = {shift,engine,time:tomorrow};
                }

            });

        });

        const next = nearest || nearestTomorrow;

        if(!next){
            nextEvent.innerText = "Tidak ada jadwal";
            nextEventTime = null;
            return;
        }

        nextEvent.innerText = `(${next.shift}) ${mapEngineName(next.engine)}`;
        nextEventTime = next.time;

    }

    // ================= COUNTDOWN =================
    setInterval(() => {

        const now = new Date();

        if(scheduleCache){
            updateNextSirene(scheduleCache,now);
        }

        if(!nextEventTime) return;

        let diff = Math.floor((nextEventTime-now)/1000);
        if(diff<0) diff=0;

        const h = String(Math.floor(diff/3600)).padStart(2,"0");
        const m = String(Math.floor((diff%3600)/60)).padStart(2,"0");
        const s = String(diff%60).padStart(2,"0");

        countdown.innerText = `${h}:${m}:${s}`;

    },1000);

    // --------------------------- REALTIME CLOCK
    function updateClock(){
        currentTimeEl.innerText = formatTime(new Date());
    }

    setInterval(updateClock,1000);
    updateClock();

    // --------------------------- UTILITY
    function formatTime(date){

        const day = date.toLocaleDateString("id-ID",{
            weekday:"long",
            year:"numeric",
            month:"long",
            day:"numeric"
        });

        const time = [
            date.getHours().toString().padStart(2,"0"),
            date.getMinutes().toString().padStart(2,"0"),
            date.getSeconds().toString().padStart(2,"0")
        ].join(":");

        return `${day}, ${time} WIB`;

    }

});
