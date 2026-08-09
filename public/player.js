const s=io();let me="",start=0,locked=false;const $=x=>document.getElementById(x);const qp=new URLSearchParams(location.search);if(qp.get("room"))$("room").value=qp.get("room");
function join(){me=$("emp").value.trim().toUpperCase();s.emit("join",{code:$("room").value,name:$("name").value,employeeCode:me})}
function answer(i){if(locked)return;locked=true;s.emit("player:answer",{choice:i,elapsed:performance.now()-start})}
function life(t){s.emit("lifeline",{type:t})}
s.on("joined",()=>{$("game").classList.remove("hidden");document.querySelectorAll("input").forEach(x=>x.disabled=true)});
s.on("errorMsg",alert);
s.on("state",x=>{
 if(x.phase==="fastest"){const p=x.pool.find(p=>p.employeeCode===me);if(p){locked=false;start=performance.now();$("status").innerHTML="⚡ FASTEST FINGER! TAP AS FAST AS YOU CAN";$("answers").innerHTML='<button class="answer hot" onclick="s.emit(\\'fastest:tap\\',{elapsed:performance.now()-start})">⚡ TAP NOW</button>'}else $("status").innerHTML="Not selected this round. You remain registered, but cannot play this round."}
 if(x.phase==="fastestResult")$("status").innerHTML=x.winner.employeeCode===me?"🏆 YOU WON!":"❌ Another player was faster.";
 if(x.phase==="question"&&x.question){locked=false;start=performance.now();$("status").innerHTML=`Q${x.current+1}<br><b>${x.question.text}</b>`;$("answers").innerHTML=x.question.options.map((o,i)=>`<button class="answer" onclick="answer(${i})">${String.fromCharCode(65+i)}. ${o}</button>`).join("");$("life").innerHTML='<button onclick="life(\\'5050\\')">50:50</button> <button onclick="life(\\'audience\\')">Audience</button> <button onclick="life(\\'phone\\')">Phone-a-Friend</button>'}
});
s.on("answerResult",r=>$("result").innerHTML=`<div class="box">${r.ok?"✅ Correct! +"+r.points:"❌ Incorrect"}</div>`);
s.on("lifelineResult",r=>{if(r.type==="5050"){document.querySelectorAll("#answers .answer").forEach((b,i)=>{if(r.remove.includes(i)){b.disabled=true;b.style.opacity=".25";b.textContent="Removed"}});$("result").innerHTML="<div class=box>50:50 used — two wrong answers removed.</div>";}else $("result").innerHTML="<div class=box>"+(r.message||"Audience opinion received.")+"</div>"});