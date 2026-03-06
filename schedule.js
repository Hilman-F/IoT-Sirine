import { db } from "./firebase.js";

import {
ref,
onValue,
update
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const container = document.getElementById("scheduleContainer");
const timeline = document.getElementById("timeline");

const engines = [
"Masuk",
"IstirahatMulai",
"IstirahatMulaiJumat",
"IstirahatSelesai",
"IstirahatSelesaiJumat",
"Pulang",
"PulangJumat"
];

const hariList = [
"Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"
];

onValue(ref(db,"Schedule"), snapshot => {

if(!container) return;

const data = snapshot.val();

if (!data) return;

renderTimeline(data);

container.innerHTML="";

Object.keys(data).forEach(shift=>{

const s = data[shift];

let html = `

<div class="bg-slate-800 p-5 rounded-xl transition-all duration-300">

<div class="flex justify-between items-center">

<div class="flex items-center gap-3 cursor-pointer"
onclick="toggleShift('${shift}')">

<span id="arrow-${shift}" class="transition-transform duration-300">
▼
</span>

<h2 class="text-xl font-bold">
${shift}
</h2>

</div>

<select onchange="updateStatus('${shift}',this.value)"
class="bg-slate-700 p-2 rounded">

<option ${s.Status==="Active"?"selected":""}>Active</option>
<option ${s.Status==="InActive"?"selected":""}>InActive</option>

</select>

</div>

<div id="shiftContent-${shift}" class="mt-4 hidden">
`;

engines.forEach(engine=>{

const e = s[engine] || {
Jam:0,
Menit:0,
Hari:[false,false,false,false,false,false,false]
};

html += `

<div class="mt-6 border-t border-slate-700 pt-4">

<h3 class="font-semibold mb-2">
${engine}
</h3>

<div class="flex gap-2 mb-3">

<input type="number"
min="0" max="23"
value="${e.Jam}"
class="bg-slate-700 p-2 rounded w-20"
onchange="updateTime('${shift}','${engine}','Jam',this.value)">

<input type="number"
min="0" max="59"
value="${e.Menit}"
class="bg-slate-700 p-2 rounded w-20"
onchange="updateTime('${shift}','${engine}','Menit',this.value)">

</div>

<div class="flex flex-wrap gap-2">
`;

for(let i=0;i<7;i++){

const active = e.Hari?.[i] ?? false;

html+=`

<button
onclick="toggleDay('${shift}','${engine}',${i},${active})"
class="px-3 py-1 rounded-full text-sm
${active?"bg-blue-600":"bg-slate-700"}">

${hariList[i]}

</button>

`;

}

html+=`

</div>
</div>

`;

});

html+=`

</div>
</div>

`;

container.innerHTML+=html;

});

});

window.updateStatus=(shift,val)=>{

update(ref(db,"Schedule/"+shift),{
Status:val
})

}

window.updateTime=(shift,engine,field,val)=>{

update(ref(db,`Schedule/${shift}/${engine}`),{
[field]:Number(val)
})

}

window.toggleDay=(shift,engine,day,current)=>{

update(
ref(db,`Schedule/${shift}/${engine}/Hari`),
{
[day]:!current
})

}

window.toggleShift=(shift)=>{

const content = document.getElementById(`shiftContent-${shift}`);
const arrow = document.getElementById(`arrow-${shift}`);

if(!content) return;

content.classList.toggle("hidden");

if(arrow){

arrow.classList.toggle("rotate-90");

}

}

function renderTimeline(schedule){

if(!timeline) return;

const now = new Date();
const day = now.getDay();

timeline.innerHTML="";

Object.keys(schedule).forEach(shift=>{

const s = schedule[shift];

if(s.Status !== "Active") return;

let html = `

<div class="bg-slate-800 p-4 rounded-xl">

<h3 class="font-bold text-lg mb-2">
${shift}
</h3>

`;

let events = [];

engines.forEach(engine=>{

const e = s[engine];

if(!e) return;

if(!e.Hari?.[day]) return;

events.push({
engine,
jam:e.Jam,
menit:e.Menit
});

});

events.sort((a,b)=>{
return (a.jam*60+a.menit) - (b.jam*60+b.menit)
});

events.forEach(e=>{

html+=`

<div class="flex justify-between py-1">

<div>${e.engine}</div>

<div class="text-blue-400">

${String(e.jam).padStart(2,"0")}:
${String(e.menit).padStart(2,"0")}

</div>

</div>

`;

});

html+=`</div>`;

timeline.innerHTML+=html;

});

}