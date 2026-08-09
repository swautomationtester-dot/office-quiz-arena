const s=io();const $=x=>document.getElementById(x);const qp=new URLSearchParams(location.search);let room=qp.get("room")||prompt("Enter room code");
if(room)s.emit("join",{code:room,name:"TV",role:"tv",employeeCode:"TV-"+Math.random().toString(36).slice(2,7)});
s.on("errorMsg",alert);s.on("state",x=>{$("join").classList.add("hidden");$("game").classList.remove("hidden");$("phase").textContent=x.phase.toUpperCase();
if(x.phase==="fastest")$("tvmain").innerHTML=`<div class=eyebrow>FASTEST FINGER FIRST</div><h1>⚡ RANDOMLY SELECTED ${x.pool.length}</h1><div class=pooltv>${x.pool.map(p=>`<div>${p.name}<small>${p.employeeCode}</small></div>`).join("")}</div>`;
else if(x.phase==="fastestResult")$("tvmain").innerHTML=`<div class=eyebrow>FASTEST FINGER WINNER</div><h1>🏆 ${x.winner.name}</h1><p>${x.winner.time.toFixed(0)} ms</p>`;
else if(x.phase==="question"&&x.question)$("tvmain").innerHTML=`<div class=eyebrow>QUESTION ${x.current+1} • ${x.question.points} POINTS</div><h1>${x.question.text}</h1><div class=tvopts>${x.question.options.map((o,i)=>`<div>${String.fromCharCode(65+i)} <span>${o}</span></div>`).join("")}</div>`;
else $("tvmain").innerHTML=`<h1>${x.phase==="finished"?"🎉 GAME COMPLETE":"Office Quiz Arena"}</h1>`;
$("ladder").innerHTML=(x.ladder||[]).map((v,i)=>`<span class=${i===x.current?"on":""}>${v}</span>`).join("")})