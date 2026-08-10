const s=io({transports:["websocket","polling"]}),$=id=>document.getElementById(id);
let fastInterval=null,audiencePollOpen=false;
function createRoom(){s.emit("host:create")}function openReg(){s.emit("host:openRegistration")}function pick7(){s.emit("host:pick7")}function restartFastest(){s.emit("host:restartFastest")}function startQuiz(){s.emit("host:startQuiz")}function next7(){s.emit("host:nextFastest")}function nextQ(){s.emit("host:nextQuestion")}function toggleAudiencePoll(){audiencePollOpen=!audiencePollOpen;s.emit(audiencePollOpen?"host:audiencePollStart":"host:audiencePollStop");updatePollButton()}function updatePollButton(){const b=$("audiencePollBtn");if(!b)return;b.textContent=audiencePollOpen?"🛑 Close Audience Poll":"🗳️ Ask Audience Poll";b.classList.toggle("danger",audiencePollOpen)}function participants(){const room=$("code").textContent.trim();if(room&&room!=="----")location.href=`/registered.html?room=${room}`}function restartEvent(){if(confirm("Reset the entire event?"))s.emit("host:restartEvent")}
function drawTimer(x){
 clearInterval(fastInterval);
 if(x.phase!=="fastest"){$("fastTimer").textContent="";return}
 const tick=()=>{const ms=Math.max(0,x.fastestStartAt+x.fastestDurationMs-Date.now());$("fastTimer").textContent=ms>5000?`GET READY • ${(ms/1000-5).toFixed(1)}s`:`FASTEST FINGER • ${(ms/1000).toFixed(1)}s`;if(ms<=0)clearInterval(fastInterval)};
 tick();fastInterval=setInterval(tick,50);
}
function letters(seq){return (seq||[]).map(n=>String.fromCharCode(65+n)).join(" ")}
s.on("room",d=>{$("code").textContent=d.code;$("url").textContent=d.joinUrl;$("qr").src=d.qr;$("screenUrl").innerHTML=`📺 TV URL: <a href="${d.screenUrl}" target="_blank" rel="noopener">${d.screenUrl}</a>`;$("area").classList.remove("hidden");$("create").disabled=true});
s.on("errorMsg",alert);
s.on("answerLocked",a=>{
 $("answerReview").classList.remove("hidden");
 $("answerReview").innerHTML=`<div class="reviewTitle">🔒 ANSWER LOCKED</div><div class="reviewAnswer">${a.contestant.name} selected <b>${String.fromCharCode(65+a.choice)}. ${a.option}</b></div><div class="reviewButtons"><button class="approve" onclick="approveAnswer()">✓ APPROVE / REVEAL</button><button class="reject" onclick="rejectAnswer()">↶ REJECT / UNLOCK</button></div>`;
});
s.on("answerRevealed",a=>{
 $("answerReview").classList.add("hidden");
 $("status").innerHTML=a.correct?`✅ Correct answer approved — ${a.contestant.name} continues.`:`❌ Wrong answer — ${a.contestant.name} is eliminated.`;
});
s.on("answerRejected",a=>{
 $("answerReview").classList.add("hidden");
 $("status").innerHTML=`↶ Answer unlocked for ${a.contestant.name}.`;
});
function approveAnswer(){s.emit("host:approveAnswer")}
function rejectAnswer(){s.emit("host:rejectAnswer")}

s.on("state",x=>{ audiencePollOpen=!!x.pollActive;renderHostAudiencePoll(x);updatePollButton();
 $("reg").textContent=x.registered;$("active").textContent=x.active;drawTimer(x);
 $("restartFastestBtn").disabled=!["fastestTimeout"].includes(x.phase);
 const msg={
 registration:"📝 Registration is OPEN.",
 fastest:`⚡ FASTEST FINGER — ${x.pool.length} selected. Watching live responses below.`,
 fastestResult:x.winner?`🏆 ${x.winner.name} won Fastest Finger in <b>${x.winner.time.toFixed(0)} ms</b>. Press Start Quiz when ready.`:"",
 fastestTimeout:"⏱️ Nobody completed the sequence. You can restart Fastest Finger with the SAME 7 players.",
 eliminated:"❌ Contestant eliminated. A NEW GAME will start with a fresh Fastest Finger round…",
 finished:"🎉 GAME COMPLETE"
 }[x.phase]||(x.phase==="question"?"":"Waiting…");
 $("status").classList.toggle("hidden",x.phase==="question");
 if(x.pendingAnswer){
 $("answerReview").classList.remove("hidden");
 $("answerReview").innerHTML=`<div class="reviewTitle">🔒 ANSWER LOCKED</div><div class="reviewAnswer">${x.pendingAnswer.name} selected <b>${String.fromCharCode(65+x.pendingAnswer.choice)}. ${x.pendingAnswer.option}</b></div><div class="reviewButtons"><button class="approve" onclick="approveAnswer()">✓ APPROVE / REVEAL</button><button class="reject" onclick="rejectAnswer()">↶ REJECT / UNLOCK</button></div>`;
}else if(x.pendingPollRequest){
 $("answerReview").classList.remove("hidden");
 $("answerReview").innerHTML=`<div class="reviewTitle">🗳️ AUDIENCE POLL REQUEST</div><div class="reviewAnswer"><b>${x.pendingPollRequest.name}</b> requested the Audience Poll lifeline.</div><div class="reviewButtons"><button class="approve" onclick="approveAudiencePoll()">✓ APPROVE POLL</button><button class="reject" onclick="rejectAudiencePoll()">✕ REJECT POLL</button></div>`;
}else{$("answerReview").classList.add("hidden")} $("status").innerHTML=msg;
 $("fastQrBox").classList.toggle("hidden",!x.fastestJoinQr || !["fastest","fastestResult","fastestTimeout"].includes(x.phase));
 if(x.fastestJoinQr) $("fastQr").src=x.fastestJoinQr;

 $("pool").innerHTML=x.pool.length?
   `<div class="selectedGrid">${x.pool.map((p,i)=>{
     const pr=(x.fastestProgress||[]).find(v=>v.employeeCode===p.employeeCode);
     const time=pr?`${pr.time.toFixed(0)} ms`:"—";
     return `<div class="selectedCard"><div class="selectedNum">${i+1}</div><div><b>${p.name}</b><small>${p.employeeCode}</small></div><strong>${time}</strong></div>`;
   }).join("")}</div>`:"<div class=muted>No players selected yet.</div>";

 $("fastResults").innerHTML=x.fastestTimes?.length?
   `<h3>Fastest Finger Times</h3>`+x.fastestTimes.sort((a,b)=>a.time-b.time).map(v=>`<div class=row><span>${v.name} <small>${v.employeeCode}</small></span><b>${v.status==="COMPLETED"?v.time.toFixed(0)+" ms":v.status}</b></div>`).join(""):"";

 $("hostLadder").innerHTML=(x.ladder||[]).map((v,i)=>`<div class="row ${i===x.current?"ladderActive":""}"><span>Q${i+1}</span><b>₹${v.toLocaleString("en-IN")}</b></div>`).join("");
 $("board").innerHTML=x.users.filter(u=>u.status!=="eliminated").sort((a,b)=>b.score-a.score).map((u,i)=>`<div class=row><span>#${i+1} ${u.name}</span><b>${u.score}</b></div>`).join("");
});

s.on("hostQuestion",q=>{ window.__hostQuestion=q;
 const old=document.getElementById("hostQuestion");
 if(!old)return;
 if(!q){old.innerHTML="";return}
 old.innerHTML=`<div class="hostQuestionCard"><div class="eyebrow">HOST ONLY • ${q.difficulty?"LEVEL "+q.difficulty:""}</div><h3>${q.text}</h3><div class="hostOptions">${q.options.map((o,i)=>`<div class="${i===q.answer?"correctHint":""}"><b>${String.fromCharCode(65+i)}</b> ${o}${i===q.answer?" <span>✓ CORRECT</span>":""}</div>`).join("")}</div></div>`;
});

function renderHostAudiencePoll(x){
 const panel=$("hostAudiencePoll"),results=$("hostAudiencePollResults");
 if(!panel||!results)return;
 if(!x?.pollActive){panel.classList.add("hidden");results.innerHTML="";return;}
 panel.classList.remove("hidden");
 const q=x.question;
 if($("hostAudiencePollQuestion"))$("hostAudiencePollQuestion").textContent=q?.text||"Audience Poll";
 const c={0:0,1:0,2:0,3:0,...(x.pollCounts||{})},total=Object.values(c).reduce((a,b)=>a+Number(b||0),0);
 const opts=q?.options||["Option A","Option B","Option C","Option D"];
 results.innerHTML=opts.map((o,i)=>{const n=Number(c[i]||0),pct=total?Math.round(n*100/total):0;return `<div class="pollVoteRow"><div><b>${String.fromCharCode(65+i)}. ${o}</b><strong>${pct}%</strong></div><div class="pollTrack"><i style="width:${pct}%"></i></div><small>${n} vote${n===1?"":"s"}</small></div>`}).join("")+`<div class="pollTotal">${total} total vote${total===1?"":"s"}</div>`;
}

function approveAudiencePoll(){s.emit("host:approveAudiencePoll")}
function rejectAudiencePoll(){s.emit("host:rejectAudiencePoll")}
s.on("poll",counts=>{ if(!audiencePollOpen)return; renderHostAudiencePoll({pollActive:true,pollCounts:counts,question:window.__hostQuestion||null}); });
s.on("audiencePollStarted",d=>{if($("status"))$("status").innerHTML=`🗳️ <b>Audience Poll approved</b> — ${d.contestant?.name||"Contestant"} can use the audience lifeline.`});
s.on("audiencePollRejected",d=>{if($("status"))$("status").innerHTML=`↶ <b>Audience Poll rejected</b> — ${d.contestant?.name||"Contestant"}`});
