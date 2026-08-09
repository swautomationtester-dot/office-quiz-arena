const s=io();let code;const $=x=>document.getElementById(x);
function createRoom(){s.emit("host:create")}
function openReg(){s.emit("host:openRegistration")}function pick7(){s.emit("host:pick7")}function startQuiz(){s.emit("host:startQuiz")}function next7(){s.emit("host:nextFastest")}function nextQ(){s.emit("host:nextQuestion")}
s.on("room",d=>{code=d.code;$("code").textContent=code;$("qr").src=d.qr;$("url").textContent=d.joinUrl;$("area").classList.remove("hidden");$("create").disabled=true});
s.on("errorMsg",alert);s.on("state",x=>{$("reg").textContent=x.users.length;$("active").textContent=x.users.filter(u=>u.status==="active").length;$("pooln").textContent=x.fastestSize;
$("status").innerHTML={registration:"📝 Registration open.",fastest:"⚡ Fastest Finger: selected "+x.pool.length+" people.",fastestResult:`🏆 ${x.winner.name} is fastest at ${x.winner.time.toFixed(0)} ms. The other selected players are eliminated.`,question:x.question?`❓ Q${x.current+1}: ${x.question.text}`:"",finished:"🎉 Game complete!"}[x.phase]||"Waiting…";
$("pool").innerHTML=x.phase.startsWith("fastest")?"<h3>Selected</h3>"+x.pool.map(p=>`<div class="row">${p.name}<b>${p.employeeCode}</b></div>`).join(""):"";
$("board").innerHTML=x.users.filter(u=>u.status!=="eliminated").sort((a,b)=>b.score-a.score).map((u,i)=>`<div class="row"><span>#${i+1} ${u.name}</span><b>${u.score}</b></div>`).join("")})