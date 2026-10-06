-- Seed TRP Persona Profiles
-- วิ่งใน Supabase SQL Editor หากไม่สามารถ inject ผ่าน MCP ได้

INSERT INTO persona_profiles (
  id, persona_key, tag, emoji, name, age, job,
  color, badge_color,
  travel_with, frequency, budget, destinations,
  channels, motivations, pain_points, quote,
  type, sort_order,
  decision_trigger, price_sensitivity,
  created_at, updated_at
) VALUES

-- R1: ทัวร์ต่างชาติรายประจำ
(
  gen_random_uuid(),
  'trp_r1',
  'R1',
  'TbWorld',
  'ทัวร์ต่างชาติรายประจำ',
  NULL, NULL,
  'from-blue-400 to-indigo-600',
  'bg-blue-100 text-blue-800 border-blue-300',
  'กรุ๊ปนักท่องเที่ยวต่างชาติ 20–45 คน',
  'รถทุกวัน ตลอดสัญญา (รายปี)',
  '฿4,500–7,000/วัน',
  'เชียงใหม่, เชียงราย, กรุงเทพฯ',
  ARRAY['รถทุกวัน', 'สัญญาปี', 'ยุโรป/จีน'],
  ARRAY['ต้องการรถประจำที่ไว้วางใจได้', 'คนขับพูดภาษาอังกฤษได้', 'ตรงเวลาทุกโปรแกรม'],
  ARRAY['รถเสียกลางทาง', 'คนขับสื่อสารภาษาต่างชาติไม่ได้', 'เปลี่ยนรถกะทันหัน'],
  'ลูกค้าของเราต้องการความสม่ำเสมอมากกว่าราคาถูก',
  'trp',
  100,
  'บริษัทแม่ต่างชาติส่ง PO มา — ตัดสินใจเร็ว ถ้าเห็นว่าคุ้มกับคุณภาพ',
  'ปานกลาง — เน้นคุณภาพและความน่าเชื่อถือ',
  NOW(), NOW()
),

-- R2: บริษัททัวร์คู่ค้า
(
  gen_random_uuid(),
  'trp_r2',
  'R2',
  'TbBuildingStore',
  'บริษัททัวร์คู่ค้า',
  NULL, NULL,
  'from-purple-400 to-violet-600',
  'bg-purple-100 text-purple-800 border-purple-300',
  'กรุ๊ปทัวร์ไทย-ต่างชาติ 15–40 คน',
  'รายกรุ๊ป ไม่ต่อเนื่อง',
  '฿3,500–5,500/วัน',
  'ทั่วภาคเหนือ',
  ARRAY['ตอบเร็ว', 'รายกรุ๊ป', 'หลายตลาด'],
  ARRAY['ราคาแข่งขันได้', 'ยืดหยุ่นรับงานกระชั้น', 'รถหลายขนาดให้เลือก'],
  ARRAY['ราคาสูงกว่าคู่แข่ง', 'ไม่มีรถว่างช่วง peak', 'โปรแกรมเปลี่ยนบ่อย'],
  'ถ้าตอบไวและราคาโอเค กรุ๊ปนี้ได้แน่นอน',
  'trp',
  101,
  'Inbound query จากไลน์กรุ๊ป — ต้องการคำตอบภายใน 30 นาที',
  'สูง — เปรียบเทียบ 2-3 เจ้า แต่ความสัมพันธ์ก็สำคัญ',
  NOW(), NOW()
),

-- R3: หน่วยงานพาคณะ
(
  gen_random_uuid(),
  'trp_r3',
  'R3',
  'TbUsersGroup',
  'หน่วยงานพาคณะ',
  NULL, NULL,
  'from-green-400 to-emerald-600',
  'bg-green-100 text-green-800 border-green-300',
  'นักเรียน/บุคลากร 30–60 คน (หลายคัน)',
  '1–3 ครั้ง/ปี ตามแผนงาน',
  '฿2,800–4,500/คัน/วัน',
  'แหล่งเรียนรู้, สวนสาธารณะ, ต่างจังหวัด',
  ARRAY['เอกสารครบ', 'รอบงบ', 'ปลอดภัย'],
  ARRAY['มีเอกสารประกวดราคา', 'รถผ่านมาตรฐานความปลอดภัย', 'ราคาโปร่งใส'],
  ARRAY['กระบวนการอนุมัติช้า', 'งบถูกตัดกะทันหัน', 'ต้องการใบเสนอราคาอย่างเป็นทางการ'],
  'ต้องผ่านคณะกรรมการก่อน ถ้าเอกสารไม่ครบจะถูกตีกลับ',
  'trp',
  102,
  'ผ่านขั้นตอนอนุมัติงบ — Lead time 2-4 สัปดาห์ล่วงหน้า',
  'ต่ำ — ราคาต่อสุดคือ factor หลัก แต่ความปลอดภัยสำคัญที่สุด',
  NOW(), NOW()
),

-- R4: ลูกค้าเช่าเองออนไลน์
(
  gen_random_uuid(),
  'trp_r4',
  'R4',
  'TbDeviceMobile',
  'ลูกค้าเช่าเองออนไลน์',
  NULL, NULL,
  'from-teal-400 to-cyan-600',
  'bg-teal-100 text-teal-800 border-teal-300',
  'ครอบครัว/กลุ่มเพื่อน 6–15 คน',
  '1–2 ครั้ง/ปี (low repeat)',
  '฿2,500–4,000/วัน',
  'เชียงใหม่, ดอยต่างๆ, ทะเล',
  ARRAY['ราคาชัดเจน', 'Google/FB', 'ครั้งแรก'],
  ARRAY['เห็นราคาชัดก่อนตัดสินใจ', 'จองผ่านช่องทางออนไลน์ได้', 'มีรีวิวประกอบ'],
  ARRAY['ราคาไม่โปร่งใส', 'ตอบช้า', 'ขั้นตอนจองยุ่งยาก'],
  'เจอใน Google แล้วเปรียบเทียบ 3-4 เจ้า ถ้าราคาชัดและรีวิวดี โอกาสปิดสูง',
  'trp',
  103,
  'เห็น Google Maps / Facebook Ad + รีวิวดี → ทักเลย',
  'สูงมาก — ราคาเป็น factor แรก ก่อนตัดสินใจ',
  NOW(), NOW()
)

ON CONFLICT (persona_key) DO UPDATE SET
  tag = EXCLUDED.tag,
  emoji = EXCLUDED.emoji,
  name = EXCLUDED.name,
  color = EXCLUDED.color,
  badge_color = EXCLUDED.badge_color,
  travel_with = EXCLUDED.travel_with,
  frequency = EXCLUDED.frequency,
  budget = EXCLUDED.budget,
  destinations = EXCLUDED.destinations,
  channels = EXCLUDED.channels,
  motivations = EXCLUDED.motivations,
  pain_points = EXCLUDED.pain_points,
  quote = EXCLUDED.quote,
  type = EXCLUDED.type,
  sort_order = EXCLUDED.sort_order,
  decision_trigger = EXCLUDED.decision_trigger,
  price_sensitivity = EXCLUDED.price_sensitivity,
  updated_at = NOW();
