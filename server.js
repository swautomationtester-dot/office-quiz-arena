const path=require("path");
const http=require("http");
const express=require("express");
const {Server}=require("socket.io");
const QRCode=require("qrcode");
const mysql=require("mysql2/promise");

const app=express(),server=http.createServer(app),io=new Server(server);
app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));

const PORT=process.env.PORT||3000;
const PUBLIC_URL=process.env.PUBLIC_URL||"http://localhost:"+PORT;
const ADMIN_PASSWORD=process.env.ADMIN_PASSWORD||"change-me";
let db=null;

async function initDb(){
  if(!process.env.DB_HOST)return;
  db=await mysql.createPool({
    host:process.env.DB_HOST,user:process.env.DB_USER,password:process.env.DB_PASSWORD,
    database:process.env.DB_NAME,port:Number(process.env.DB_PORT||3306),
    waitForConnections:true,connectionLimit:5
  });
  await db.query(`CREATE TABLE IF NOT EXISTS questions(
    id INT AUTO_INCREMENT PRIMARY KEY,text_q TEXT NOT NULL,
    option_a VARCHAR(500) NOT NULL,option_b VARCHAR(500) NOT NULL,
    option_c VARCHAR(500) NOT NULL,option_d VARCHAR(500) NOT NULL,
    answer_idx TINYINT NOT NULL,points INT NOT NULL DEFAULT 100
  )`);
  const [rows]=await db.query("SELECT COUNT(*) c FROM questions");
  if(!rows[0].c) await seedDb();
}
async function seedDb(){
 const qs=[
 ["Which planet is known as the Red Planet?",["Venus","Mars","Jupiter","Mercury"],1,100],
 ["What is the capital of India?",["Mumbai","New Delhi","Chennai","Kolkata"],1,200],
 ["Which company created Windows?",["Apple","IBM","Microsoft","Google"],2,300],
 ["How many sides does a hexagon have?",["5","6","7","8"],1,500],
 ["Which ocean is the largest?",["Atlantic","Indian","Pacific","Arctic"],2,1000]
 ];
 for(const q of qs)await db.query("INSERT INTO questions(text_q,option_a,option_b,option_c,option_d,answer_idx,points) VALUES(?,?,?,?,?,?,?)",[q[0],...q[1],q[2],q[3]]);
}
const fallbackQuestions=[
 {text:"Which planet is known as the Red Planet?",options:["Venus","Mars","Jupiter","Mercury"],answer:1,points:100},
 {text:"What is the capital of India?",options:["Mumbai","New Delhi","Chennai","Kolkata"],answer:1,points:200},
 {text:"Which company created Windows?",options:["Apple","IBM","Microsoft","Google"],answer:2,points:300},
 {text:"How many sides does a hexagon have?",options:["5","6","7","8"],answer:1,points:500},
 {text:"Which ocean is the largest?",options:["Atlantic","Indian","Pacific","Arctic"],answer:2,points:1000}
];
async function loadQuestions(){
 if(!db)return structuredClone(fallbackQuestions);
 const [rows]=await db.query("SELECT * FROM questions ORDER BY id");
 return rows.map(r=>({id:r.id,text:r.text_q,options:[r.option_a,r.option_b,r.option_c,r.option_d],answer:r.answer_idx,points:r.points}));
}
const rooms=new Map();
function roomNew(){return{host:null,users:new Map(),questions:[],current:-1,phase:"lobby",pool:[],winner:null,failed:new Set(),answers:new Map(),poll:new Map(),lifelines:new Map(),prizeLadder:[100,200,300,500,1000,2000,5000,10000,20000,50000],config:{fastestSize:7,timeLimit:20}}}
function active(r){return [...r.users.values()].filter(x=>x.status==="active")}
function emitState(code){
 const r=rooms.get(code);if(!r)return;
 const q=r.questions[r.current];
 io.to(code).emit("state",{phase:r.phase,current:r.current,question:q?{text:q.text,options:q.options,points:q.points}:null,
  users:[...r.users.values()].map(x=>({id:x.id,name:x.name,employeeCode:x.employeeCode,score:x.score,status:x.status})),
  pool:r.pool.map(x=>({name:x.name,employeeCode:x.employeeCode,id:x.id})),
  winner:r.winner?{name:r.winner.name,employeeCode:r.winner.employeeCode,time:r.winner.time}:null,
  ladder:r.prizeLadder,fastestSize:r.config.fastestSize,timeLimit:r.config.timeLimit});
}
function pickPool(r){
 const eligible=active(r).filter(x=>!r.failed.has(x.employeeCode));
 r.pool=eligible.sort(()=>Math.random()-.5).slice(0,r.config.fastestSize);
 r.winner=null;r.pool.forEach(x=>x.inPool=true);r.phase="fastest";r.fastestStarted=Date.now();
}
app.get("/health",(req,res)=>res.json({ok:true,service:"office-quiz-arena"}));
app.post("/api/admin/login",(req,res)=>res.json({ok:req.body.password===ADMIN_PASSWORD}));
app.get("/api/questions",async(req,res)=>{try{res.json(await loadQuestions())}catch(e){res.status(500).json({error:e.message})}});
app.post("/api/questions",async(req,res)=>{
 if(req.headers["x-admin-password"]!==ADMIN_PASSWORD)return res.status(401).json({error:"Unauthorized"});
 if(!db)return res.status(400).json({error:"Database not configured"});
 const {text,options,answer,points}=req.body;
 await db.query("INSERT INTO questions(text_q,option_a,option_b,option_c,option_d,answer_idx,points) VALUES(?,?,?,?,?,?,?)",[text,...options,answer,points]);
 res.json({ok:true});
});
app.delete("/api/questions/:id",async(req,res)=>{
 if(req.headers["x-admin-password"]!==ADMIN_PASSWORD)return res.status(401).json({error:"Unauthorized"});
 if(!db)return res.status(400).json({error:"Database not configured"});
 await db.query("DELETE FROM questions WHERE id=?",[req.params.id]);res.json({ok:true});
});

io.on("connection",s=>{
 s.on("host:create",async()=>{
   let code;do code=Math.random().toString(36).slice(2,6).toUpperCase();while(rooms.has(code));
   const r=roomNew();r.host=s.id;r.questions=await loadQuestions();rooms.set(code,r);s.join(code);s.data.room=code;s.data.role="host";
   const join=PUBLIC_URL+"/join.html?room="+code;
   s.emit("room",{code,qr:await QRCode.toDataURL(join),joinUrl:join});emitState(code);
 });
 s.on("join",({code,name,employeeCode,role="player"})=>{
   const r=rooms.get(String(code||"").toUpperCase());if(!r)return s.emit("errorMsg","Room not found.");
   code=String(code).toUpperCase();
   if(role==="audience"||role==="tv"){
     s.join(code);s.data.room=code;s.data.role=role;s.emit("joined",{name:role});return;
   }
   name=String(name||"").trim();employeeCode=String(employeeCode||"").trim().toUpperCase();
   if(!name||!employeeCode)return s.emit("errorMsg","Name and employee code are required.");
   if([...r.users.values()].some(x=>x.employeeCode===employeeCode))return s.emit("errorMsg","Employee code already registered.");
   const u={id:s.id,name,employeeCode,score:0,status:"active"};r.users.set(s.id,u);s.join(code);s.data.room=code;s.data.role="player";
   s.emit("joined",{name,employeeCode});emitState(code);
 });
 s.on("host:openRegistration",()=>{const r=rooms.get(s.data.room);if(!r||r.host!==s.id)return;r.phase="registration";emitState(s.data.room)});
 s.on("host:pick7",()=>{const r=rooms.get(s.data.room);if(!r||r.host!==s.id)return;pickPool(r);emitState(s.data.room)});
 s.on("fastest:tap",({elapsed})=>{
   const r=rooms.get(s.data.room);if(!r||r.phase!=="fastest"||r.winner)return;
   const u=r.users.get(s.id);if(!u||!r.pool.some(x=>x.id===s.id))return;
   r.winner={...u,time:Number(elapsed||0)};r.phase="fastestResult";
   r.pool.filter(x=>x.id!==s.id).forEach(x=>{x.status="eliminated";r.failed.add(x.employeeCode)});
   emitState(s.data.room);
 });
 s.on("host:startQuiz",()=>{const r=rooms.get(s.data.room);if(!r||r.host!==s.id||!r.winner)return;r.phase="question";r.current=0;r.answers.clear();r.poll.clear();emitState(s.data.room)});
 s.on("host:nextFastest",()=>{const r=rooms.get(s.data.room);if(!r||r.host!==s.id)return;pickPool(r);emitState(s.data.room)});
 s.on("host:nextQuestion",()=>{const r=rooms.get(s.data.room);if(!r||r.host!==s.id)return;r.current++;r.answers.clear();r.poll.clear();r.lifelines.clear();if(r.current>=r.questions.length){r.phase="finished";r.current=-1}else r.phase="question";emitState(s.data.room)});
 s.on("player:answer",({choice,elapsed})=>{
   const r=rooms.get(s.data.room);if(!r||r.phase!=="question")return;const u=r.users.get(s.id);
   if(!u||u.status!=="active"||r.answers.has(s.id))return;const q=r.questions[r.current],ok=Number(choice)===q.answer;
   r.answers.set(s.id,{choice:Number(choice),ok});if(ok)u.score+=q.points;s.emit("answerResult",{ok,correct:q.answer,points:ok?q.points:0});emitState(s.data.room);
 });
 s.on("audience:poll",({choice})=>{const r=rooms.get(s.data.room);if(!r||r.phase!=="question")return;r.poll.set(s.id,Number(choice));const c={};for(const x of r.poll.values())c[x]=(c[x]||0)+1;io.to(s.data.room).emit("poll",c)});
 s.on("lifeline",({type})=>{const r=rooms.get(s.data.room);if(!r||r.phase!=="question")return;const u=r.users.get(s.id);if(!u)return;
   const key=s.id+":"+r.current;if(r.lifelines.has(key))return;
   r.lifelines.set(key,type);const q=r.questions[r.current];
   if(type==="5050"){const wrong=q.options.map((_,i)=>i).filter(i=>i!==q.answer).sort(()=>Math.random()-.5).slice(0,2);s.emit("lifelineResult",{type,remove:wrong})}
   if(type==="audience"){const counts={};for(const c of r.poll.values())counts[c]=(counts[c]||0)+1;s.emit("lifelineResult",{type,counts})}
   if(type==="phone"){s.emit("lifelineResult",{type,message:"Phone-a-Friend: Ask a colleague and choose your answer!"})}
 });
 s.on("disconnect",()=>{const r=rooms.get(s.data.room);if(!r)return;if(r.host===s.id){io.to(s.data.room).emit("errorMsg","Host disconnected.");rooms.delete(s.data.room)}});
});
initDb().then(()=>server.listen(PORT,()=>console.log("Office Quiz Arena on "+PORT))).catch(e=>{console.error(e);process.exit(1)});
