// Regression suite: every normal app flow must still work under the new
// policies, using the CURRENTLY DEPLOYED client behaviour (3-request edit,
// direct table writes) since migration part 2 is intentionally not applied.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
function loadEnvLocal(p){for(const l of readFileSync(p,"utf8").split("\n")){const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);if(m)process.env[m[1]]??=m[2];}}
loadEnvLocal(process.env.ENV_FILE ?? ".env.local");
const URL=process.env.NEXT_PUBLIC_SUPABASE_URL, ANON=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
// Ephemeral, per-run credential for throwaway accounts -- never a real one.
const PASSWORD=process.env.TEST_PASSWORD ?? `Zz-${crypto.randomUUID()}`, ts=Date.now();
const nc=()=>createClient(URL,ANON,{auth:{autoRefreshToken:false,persistSession:false}});
async function mkUser(tag){const c=nc();const email=`zztest-reg-${tag}-${ts}@example.com`;
  const {data,error}=await c.auth.signUp({email,password:PASSWORD}); if(error)throw new Error(error.message);
  if(!data.session){const{error:e2}=await c.auth.signInWithPassword({email,password:PASSWORD}); if(e2)throw new Error(e2.message);}
  const {data:u}=await c.auth.getUser(); return {c,id:u.user.id};}
const R=[]; const rec=(n,p,d)=>{R.push({n,p,d});console.log(`${p?"PASS":"FAIL"} :: ${n}${d?" :: "+d:""}`);};

const alice=await mkUser("alice"), bob=await mkUser("bob");
const {data:flat}=await alice.c.rpc("create_flat",{flat_name:`zzreg-${ts}`});
rec("R1 create_flat works", Boolean(flat?.id));
const {data:bobM,error:je}=await bob.c.rpc("join_flat_with_invite_code",{code:flat.invite_code});
rec("R2 join_flat_with_invite_code works", !je && Boolean(bobM?.id), je?.message);
const {data:aliceM}=await alice.c.from("flat_members").select("id").eq("flat_id",flat.id).eq("user_id",alice.id).single();
const A=aliceM.id,B=bobM.id;

// R3: normal expense creation (payer == creator)
const {data:e1,error:e1e}=await alice.c.from("expenses").insert({flat_id:flat.id,title:"Rent",category:"rent",
  amount_paise:100000,expense_date:new Date().toISOString(),split_type:"equal",paid_by:A,created_by:alice.id}).select().single();
rec("R3 create expense (payer == creator)", !e1e && Boolean(e1?.id), e1e?.message);
const {error:s1e}=await alice.c.from("expense_splits").insert([
  {expense_id:e1.id,member_id:A,share_amount_paise:50000},{expense_id:e1.id,member_id:B,share_amount_paise:50000}]);
rec("R4 insert splits as payer/creator", !s1e, s1e?.message);

// R5: ON BEHALF OF -- Bob records an expense that ALICE paid, and inserts its
// splits. This is the flow the new insert policy had to preserve.
// Spoofing created_by to someone else must now be rejected outright.
const {error:spoofErr}=await bob.c.from("expenses").insert({flat_id:flat.id,title:"Spoof",category:"other",
  amount_paise:1000,expense_date:new Date().toISOString(),split_type:"equal",paid_by:A,created_by:alice.id});
rec("R5a created_by cannot be spoofed to another user", Boolean(spoofErr), spoofErr?.code);

const {data:e2,error:e2e}=await bob.c.from("expenses").insert({flat_id:flat.id,title:"Wifi",category:"internet",
  amount_paise:60000,expense_date:new Date().toISOString(),split_type:"equal",paid_by:A,created_by:bob.id}).select().single();
rec("R5 create expense on behalf of another member (paid_by = Alice, created_by = Bob)", !e2e && Boolean(e2?.id), e2e?.message);
const {error:s2e}=await bob.c.from("expense_splits").insert([
  {expense_id:e2.id,member_id:A,share_amount_paise:30000},{expense_id:e2.id,member_id:B,share_amount_paise:30000}]);
rec("R6 creator (non-payer) can insert that expense's splits", !s2e, s2e?.message);

// R7: payer can edit their own expense (deployed 3-request flow)
const {data:u1,error:u1e}=await alice.c.from("expenses").update({title:"Rent (May)",amount_paise:120000})
  .eq("id",e1.id).select().single();
rec("R7 payer edits own expense (amount change)", !u1e && u1?.amount_paise===120000, u1e?.message);
const {error:d1e}=await alice.c.from("expense_splits").delete().eq("expense_id",e1.id);
rec("R8 payer clears old splits", !d1e, d1e?.message);
const {error:i1e}=await alice.c.from("expense_splits").insert([
  {expense_id:e1.id,member_id:A,share_amount_paise:60000},{expense_id:e1.id,member_id:B,share_amount_paise:60000}]);
rec("R9 payer writes new splits", !i1e, i1e?.message);

// R10: full settlement request -> approve flow
const {data:req,error:reqe}=await bob.c.rpc("create_settlement_request",
  {receiver_member_id:A,amount_paise:60000,method:"upi",p_expense_id:e1.id}).select().single();
rec("R10 debtor creates settlement request", !reqe && Boolean(req?.id), reqe?.message);
const {data:appr,error:appre}=await alice.c.rpc("approve_settlement_request",{request_id:req.id}).select().single();
rec("R11 receiver approves -> settlement row created via SECURITY DEFINER", !appre && Boolean(appr?.id), appre?.message);

// R12: creditor direct 'Mark as paid'
const {data:rs,error:rse}=await alice.c.from("settlements")
  .insert({flat_id:flat.id,from_member_id:B,to_member_id:A,amount_paise:1000,method:"cash"}).select();
rec("R12 creditor records money received (Mark as paid)", !rse && (rs??[]).length===1, rse?.message);

// R13: reject flow
const {data:req2}=await bob.c.rpc("create_settlement_request",{receiver_member_id:A,amount_paise:500,method:"upi"}).select().single();
const {error:rej}=await alice.c.rpc("reject_settlement_request",{request_id:req2.id});
rec("R13 receiver rejects a settlement request", !rej, rej?.message);

// R14: display name update
const {data:dn,error:dne}=await alice.c.from("profiles").update({display_name:"Alice A"}).eq("id",alice.id).select().single();
rec("R14 user updates own display name", !dne && dn?.display_name==="Alice A", dne?.message);

// R15: flat rename by owner
const {data:fr,error:fre}=await alice.c.from("flats").update({name:"Renamed Flat"}).eq("id",flat.id).select();
rec("R15 owner renames flat", !fre && (fr??[]).length===1, fre?.message);

// R16: payer deletes own expense
const {data:dl,error:dle}=await alice.c.from("expenses").delete().eq("id",e1.id).select();
rec("R16 payer deletes own expense", !dle && (dl??[]).length===1, dle?.message);

// R17: notifications readable + markable by owner
const {data:notif}=await alice.c.from("notifications").select("id").limit(1);
if ((notif??[]).length) {
  const {error:ne}=await alice.c.from("notifications").update({is_read:true,read_at:new Date().toISOString()}).eq("id",notif[0].id);
  rec("R17 user marks own notification read", !ne, ne?.message);
} else rec("R17 user marks own notification read", true, "no notifications generated (skipped)");

// R18: legitimate identical expenses stay separate (dedupe must not over-match)
const dk1=crypto.randomUUID(), dk2=crypto.randomUUID();
const {data:x1}=await alice.c.from("expenses").insert({flat_id:flat.id,title:"WiFi",category:"internet",
  amount_paise:200000,expense_date:new Date().toISOString(),split_type:"equal",paid_by:A,created_by:alice.id,client_dedupe_key:dk1}).select().single();
const {data:x2}=await alice.c.from("expenses").insert({flat_id:flat.id,title:"WiFi",category:"internet",
  amount_paise:200000,expense_date:new Date().toISOString(),split_type:"equal",paid_by:A,created_by:alice.id,client_dedupe_key:dk2}).select().single();
rec("R18 two identical expenses with different dedupe keys both persist", Boolean(x1?.id&&x2?.id&&x1.id!==x2.id));
const {error:dupErr}=await alice.c.from("expenses").insert({flat_id:flat.id,title:"WiFi",category:"internet",
  amount_paise:200000,expense_date:new Date().toISOString(),split_type:"equal",paid_by:A,created_by:alice.id,client_dedupe_key:dk1});
rec("R19 replaying the SAME dedupe key is rejected by the DB", dupErr?.code==="23505", dupErr?.code);

console.log("\n=== REGRESSION SUMMARY ===");
const f=R.filter(r=>!r.p);
console.log(`${R.length-f.length}/${R.length} passed`);
f.forEach(x=>console.log("  FAILED:",x.n,"|",x.d));
process.exit(f.length?1:0);
