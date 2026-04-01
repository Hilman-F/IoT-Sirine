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
    const relayManual = document.getElementById("relayManual");
    const manualControl = document.getElementById("manualControl");
    
    const durasiSirine = document.getElementById("durasiSirine")
    const durasiNow = document.getElementById("durasiNow");
    let lastValue = "";
    let timeout = null;
    let isTyping = false;

    const updateTime = document.getElementById("updateTime");
    const currentTimeEl = document.getElementById("currentTime");
    const espStatus = document.getElementById("espStatus");
    const ssid = document.getElementById("SSID");
    const signalStatus = document.getElementById("signal-dBm");

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
    onValue(ref(db,"updateTime"), snap => {

        const timeStr = snap.val();
        if(!timeStr) return;

        const now = new Date();
        const last = new Date(timeStr.replace(" ","T"));
        const diff = (now-last)/1000;

        espStatus.innerText = diff < 20 ? "ONLINE" : "OFFLINE";
        espStatus.className = diff < 20 ? "value text-green-400" : "value text-red-500";

        const date = now.toLocaleDateString("id-ID",{
            weekday:"long",
            year:"numeric",
            month:"long",
            day:"numeric"
        });

        const time = [
            last.getHours(),
            last.getMinutes(),
            last.getSeconds()
        ].map(n=>String(n).padStart(2,"0")).join(":");

        updateTime.innerText = `${date} - ${time} WIB`;

        if(scheduleCache){
            updateNextSirene(scheduleCache, now);
        }

    });

    // ================= SSID =================
    onValue(ref(db,"Status/WiFi_SSID"), snap => {
        ssid.innerText = snap.val() ? snap.val() : "-"
    });

    // ================= Signal =================
    onValue(ref(db,"Status/WiFi_RSSI"), snap => {
        let dbm = snap.val(); // contoh: -55, -70, -80
        signalStatus.innerText = snap.val() ? snap.val() + " dBm" : "-"

        if (dbm > -60) {
            // GOOD
            signalStatus.classList.add("text-green-400");
        } else if (dbm >= -70 && dbm <= -60) {
            // FAIR
            signalStatus.classList.add("text-orange-400");
        } else if (dbm < -70) {
            // POOR
            signalStatus.classList.add("text-red-700");
        }
    });

    onValue(ref(db,"Status/WiFi_RSSI"), snap => {
        let dbm = snap.val(); // contoh: -55, -70, -80
        let bars = document.querySelectorAll("#signal .bar");

        // reset semua bar
        bars.forEach(bar => {
            bar.classList.remove("active");
            bar.style.backgroundColor = "#9ca3af";
        });

        let activeCount = 0;
        let color = "";

        if (dbm > -60) {
            // GOOD
            activeCount = 4;
            color = "green";
        } else if (dbm >= -70 && dbm <= -60) {
            // FAIR
            activeCount = 2;
            color = "orange";
        } else if (dbm < -70) {
            // POOR
            activeCount = 1;
            color = "red";
        }

        // aktifkan bar sesuai kondisi
        for (let i = 0; i < activeCount; i++) {
            bars[i].style.backgroundColor = color;
            bars[i].classList.add("active");
        }
    });

    // ================= Durasi =================
    onValue(ref(db, "durasiSirine"), (snap) => {
        const durasi = snap.val() || 0;
    
        // Jangan overwrite kalau user lagi ngetik
        if (!isTyping) {
            durasiNow.value = durasi;
        }
    
        lastValue = durasi;
    });
    
    // Auto save saat input berubah
    durasiNow.addEventListener("input", () => {
        isTyping = true;
    
        clearTimeout(timeout);
    
        timeout = setTimeout(() => {
            let newValue = parseInt(durasiNow.value);
    
            // validasi sederhana
            if (isNaN(newValue)) newValue = 0;
    
            if (newValue !== lastValue) {
                set(ref(db, "durasiSirine"), newValue)
                    .then(() => {
                        lastValue = newValue;
                        console.log("Tersimpan");
                    })
                    .catch(() => {
                        console.log("Gagal simpan");
                    });
            }
    
            isTyping = false;
        }, 800); // delay biar tidak spam
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
            durasiSirine.classList.remove("hidden");
            autoTimer.classList.remove("hidden");
            set(ref(db,"relayManual"),false);
        }
        else{
            durasiSirine.classList.add("hidden");
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
