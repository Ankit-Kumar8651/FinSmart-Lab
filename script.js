/* script.js - FinSmart Lab
   Comments in Hindi to help samajhne mein.
*/

/* ========== INIT ========== */
AOS.init(); // animate on scroll

// Load particles (particles.json file must be in same folder)
particlesJS.load('particles-js', 'particles.json', function() {
  console.log('particles loaded');
});

// LocalStorage key
const STORAGE_KEY = 'finsmart_expenses_v1';

// Load saved data
let expenses = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let budget = parseFloat(localStorage.getItem('finsmart_budget') || '0');

// Chart contexts
const ctxExpense = document.getElementById('expenseChart')?.getContext('2d');
const ctxSip = document.getElementById('sipChart')?.getContext('2d');
let expenseChart, sipChart;

// DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  renderAll();
});

/* ========== UI INIT & EVENTS ========== */
function initUI() {
  document.getElementById('addBtn')?.addEventListener('click', addExpense);
  document.getElementById('setBudget')?.addEventListener('click', setBudget);
  document.getElementById('calcSip')?.addEventListener('click', calculateSIP);
  document.getElementById('planBtn')?.addEventListener('click', planPocket);
  document.getElementById('exportBtn')?.addEventListener('click', exportCSV);
  document.getElementById('clearBtn')?.addEventListener('click', clearAll);

  // Chatbot events
  const fab = document.getElementById('chatbot-fab');
  const panel = document.getElementById('chatbot-panel');
  const chatClose = document.getElementById('chat-close');
  const chatSend = document.getElementById('chat-send');
  const chatInput = document.getElementById('chat-input');

  fab?.addEventListener('click', () => {
    const isHidden = panel.getAttribute('aria-hidden') === 'true';
    panel.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
    chatInput?.focus();
  });
  chatClose?.addEventListener('click', () => panel.setAttribute('aria-hidden', 'true'));
  chatSend?.addEventListener('click', sendChatMessage);
  chatInput?.addEventListener('keydown', e => { if (e.key === 'Enter') sendChatMessage(); });

  // show budget if set
  if (budget) document.getElementById('showBudget').innerText = '₹' + budget;
}

/* ========== EXPENSES ========== */
function addExpense() {
  const amountEl = document.getElementById('amount');
  const catEl = document.getElementById('category');
  const dateEl = document.getElementById('date');

  const amount = parseFloat(amountEl.value);
  const category = catEl.value.trim();
  const date = dateEl.value || new Date().toISOString().slice(0, 10);

  if (!amount || !category) { alert('Please enter amount and category'); return; }

  // push & save
  expenses.push({ amount, category, date });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));

  // clear inputs
  amountEl.value = ''; catEl.value = ''; dateEl.value = '';

  renderAll();
}

function setBudget() {
  const b = parseFloat(document.getElementById('budget').value);
  if (!b) return alert('Enter valid budget');
  budget = b;
  localStorage.setItem('finsmart_budget', String(budget));
  document.getElementById('showBudget').innerText = '₹' + budget;
  renderAll();
}

function clearAll() {
  if (!confirm('Clear all saved expenses?')) return;
  expenses = [];
  localStorage.removeItem(STORAGE_KEY);
  renderAll();
}

/* ========== RENDER & CHARTS ========== */
function renderAll() {
  updateSummary();
  renderList();
  drawExpenseChart();
  updateDashboard();
}

function updateSummary() {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  document.getElementById('total').innerText = 'Total: ₹' + total.toFixed(2);
  document.getElementById('count').innerText = 'Entries: ' + expenses.length;

  const alertEl = document.getElementById('budgetAlert');
  if (budget && total > budget) {
    alertEl.innerText = 'Budget exceeded! Try reducing spending.';
    sendBudgetNotification('Budget exceeded', `You spent ₹${total.toFixed(2)} > budget ₹${budget}`);
  } else {
    alertEl.innerText = '';
  }
}

function renderList() {
  const list = document.getElementById('expenseList');
  list.innerHTML = '';
  // reverse show latest first
  expenses.slice().reverse().forEach(e => {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<div><strong>₹${e.amount.toFixed(2)}</strong> — ${e.category}</div><div>${e.date}</div>`;
    list.appendChild(el);
  });
}

function drawExpenseChart() {
  if (!ctxExpense) return;
  const cats = Array.from(new Set(expenses.map(e => e.category)));
  const data = cats.map(c => expenses.filter(e => e.category === c).reduce((s, el) => s + el.amount, 0));
  if (expenseChart) expenseChart.destroy();
  expenseChart = new Chart(ctxExpense, {
    type: 'doughnut',
    data: {
      labels: cats.length ? cats : ['No Data'],
      datasets: [{ data: cats.length ? data : [1], backgroundColor: ['#00ffd0', '#00aaff', '#ff6ec7', '#ffd166', '#8affc1'] }]
    },
    options: {
      plugins: { legend: { labels: { color: '#eafdf7' } } },
      animation: { duration: 900 }
    }
  });
}

/* ========== SIP CALCULATOR ========== */
function calculateSIP() {
  const amount = parseFloat(document.getElementById('sipAmount').value);
  const years = parseFloat(document.getElementById('sipYears').value);
  const ratePercent = parseFloat(document.getElementById('sipRate').value);
  if (!amount || !years || !ratePercent) { alert('Enter valid SIP inputs'); return; }

  const monthlyRate = (ratePercent / 100) / 12;
  const months = Math.round(years * 12);
  const fv = amount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
  document.getElementById('sipResult').innerText = 'Future value (approx): ₹' + fv.toFixed(2);

  // draw chart
  drawSipChart(amount, months, monthlyRate);
}

function drawSipChart(monthly, months, rate) {
  if (!ctxSip) return;
  const labels = [];
  const values = [];
  let acc = 0;
  for (let m = 1; m <= months; m++) {
    acc = acc * (1 + rate) + monthly;
    labels.push('M' + m);
    values.push(parseFloat(acc.toFixed(2)));
  }
  if (sipChart) sipChart.destroy();
  sipChart = new Chart(ctxSip, {
    type: 'line',
    data: { labels, datasets: [{ label: 'SIP value', data: values, fill: true, tension: 0.3 }] },
    options: { plugins: { legend: { labels: { color: '#eafdf7' } } }, animation: { duration: 900 } }
  });
}

/* ========== PLANNER ========== */
function planPocket() {
  const amount = parseFloat(document.getElementById('pocketAmount').value || '0');
  const days = parseInt(document.getElementById('pocketPeriod').value || '7');
  if (!amount || !days) return alert('Enter pocket amount and period');
  const perDay = amount / days;
  let out = `<p>₹${amount.toFixed(2)} over ${days} days → ₹${perDay.toFixed(2)} per day.</p><div class="daily-list">`;
  for (let i = 1; i <= days; i++) out += `<div>Day ${i}: ₹${perDay.toFixed(2)}</div>`;
  out += '</div>';
  document.getElementById('planOutput').innerHTML = out;
}

/* ========== EXPORT CSV ========== */
function exportCSV() {
  if (!expenses.length) return alert('No data to export');
  const rows = [['Amount', 'Category', 'Date']];
  expenses.forEach(e => rows.push([e.amount, e.category, e.date]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click();
  URL.revokeObjectURL(url);
}

/* ========== DASHBOARD ========== */
function updateDashboard() {
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const saved = Math.max(0, (budget ? budget - total : 0));
  document.getElementById('saved').innerText = '₹' + saved.toFixed(2);
  document.getElementById('spent').innerText = '₹' + total.toFixed(2);
  document.getElementById('showBudget').innerText = budget ? ('₹' + budget) : '—';
  document.getElementById('wall-saved').querySelector('.value').innerText = '₹' + saved.toFixed(2);
  document.getElementById('wall-spent').querySelector('.value').innerText = '₹' + total.toFixed(2);
  document.getElementById('wall-budget').querySelector('.value').innerText = budget ? ('₹' + budget) : '—';
  document.getElementById('topCat').innerText = getTopCategory() || '—';
  document.getElementById('wall-topcat').querySelector('.value').innerText = getTopCategory() || '—';
}

function getTopCategory() {
  if (!expenses.length) return '';
  const map = {};
  expenses.forEach(e => map[e.category] = (map[e.category] || 0) + e.amount);
  const top = Object.entries(map).sort((a, b) => b[1] - a[1])[0];
  return top ? `${top[0]} (₹${top[1].toFixed(2)})` : '';
}

/* ========== NOTIFICATIONS ========== */
async function sendBudgetNotification(title, body) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") await Notification.requestPermission();
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else {
    const el = document.getElementById('budgetAlert');
    if (el) el.innerText = body;
  }
}

/* ========== CHATBOT (simple rule-based) ========== */
const chatBody = document.getElementById('chat-body');

function appendMsg(text, who = 'bot') {
  const el = document.createElement('div');
  el.className = 'msg ' + (who === 'user' ? 'user' : 'bot');
  el.textContent = text;
  chatBody.appendChild(el);
  chatBody.scrollTop = chatBody.scrollHeight;
}

function sendChatMessage() {
  const chatInput = document.getElementById('chat-input');
  const txt = chatInput.value.trim();
  if (!txt) return;
  appendMsg(txt, 'user');
  chatInput.value = '';

  const q = txt.toLowerCase();

  // -----------------------
  // FinSmart Bot Knowledge
  // -----------------------

  // Greetings
  if (/(hello|hi|hey)/.test(q)) {
    appendMsg("Hi 👋 I'm FinSmart Bot — your digital money friend!");
    appendMsg("Ask me anything about budget, saving, SIP, or expense tracking.");
  }

  // Help
  else if (q.includes('help')) {
    appendMsg("Here’s what I can help with:");
    appendMsg("1️⃣ Expense Tracker — Record daily expenses");
    appendMsg("2️⃣ Budget — Control your spending");
    appendMsg("3️⃣ SIP — Calculate future investment value");
    appendMsg("4️⃣ Pocket Planner — Plan weekly or monthly money");
    appendMsg("5️⃣ Dashboard — See your progress in one place");
  }

  // What is FinSmart
  else if (q.includes('finsmart') || q.includes('lab')) {
    appendMsg("FinSmart Lab is a student finance tool 🧠");
    appendMsg("It helps you manage expenses, budget, SIP, and savings easily — all in one dashboard!");
  }

  // Expense Tracker
  else if (q.includes('expense') || q.includes('track')) {
    appendMsg("Expense Tracker helps you record daily spending 💰");
    appendMsg("Enter amount, category (like food, travel), and date → click Add.");
    appendMsg("You can also view your spending chart for better analysis!");
  }

  // Budget
  else if (q.includes('budget')) {
    appendMsg("Budget feature lets you fix a spending limit 💸");
    appendMsg("When your total expenses cross your budget, I’ll warn you instantly!");
    appendMsg("Try setting it in the Tracker section.");
  }

  // Pocket Planner
  else if (q.includes('planner') || q.includes('pocket')) {
    appendMsg("Pocket Planner divides your money into days or weeks 📅");
    appendMsg("Example: ₹1000 for 7 days → ₹142/day available.");
    appendMsg("Perfect for students managing daily expenses.");
  }

  // SIP - Explanation
  else if (q.includes('sip') && !/\d+/.test(q)) {
    appendMsg("SIP = Systematic Investment Plan 📈");
    appendMsg("You invest a small fixed amount every month to grow savings safely.");
    appendMsg("Type like: 500 5 12% → ₹500/month, 5 years, 12% return rate.");
  }

  // SIP - Calculation
  else if (/\d+/.test(q) && q.match(/\d+/g).length >= 3) {
    const nums = q.match(/\d+(\.\d+)?/g);
    const amount = parseFloat(nums[0]);
    const years = parseFloat(nums[1]);
    const rate = parseFloat(nums[2]) / 100;
    const months = years * 12;
    const monthlyRate = rate / 12;
    const fv = amount * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) * (1 + monthlyRate);
    appendMsg(`📊 SIP Result: If you invest ₹${amount}/month for ${years} yrs at ${nums[2]}% → You’ll get approx ₹${fv.toFixed(2)}.`);
  }

  // Dashboard
  else if (q.includes('dashboard')) {
    appendMsg("Dashboard shows your financial summary 🧾");
    appendMsg("It includes total spent, savings, top category, and remaining budget — all updated live.");
  }

  // Summary (Read localStorage)
  else if (q.includes('summary') || q.includes('status')) {
    const expenses = JSON.parse(localStorage.getItem('finsmart_expenses_v1') || '[]');
    const budget = parseFloat(localStorage.getItem('finsmart_budget') || '0');
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const left = budget ? (budget - total).toFixed(2) : '—';
    appendMsg(`You have recorded ${expenses.length} expenses totaling ₹${total.toFixed(2)}.`);
    if (budget) appendMsg(`Budget: ₹${budget} | Remaining: ₹${left}`);
    else appendMsg("No budget set yet. Try setting one in Tracker section!");
  }

  // How to save
  else if (q.includes('how') && q.includes('save')) {
    appendMsg("💡 Saving Tips:");
    appendMsg("1️⃣ Track every expense — small or big.");
    appendMsg("2️⃣ Use SIP for monthly savings.");
    appendMsg("3️⃣ Avoid impulse shopping.");
    appendMsg("4️⃣ Set 20% of your money aside every month.");
  }

  // Saving Tips (keyword)
  else if (q.includes('saving') || q.includes('tip')) {
    appendMsg("Here are a few saving ideas 💰:");
    appendMsg("- Avoid unnecessary subscriptions.");
    appendMsg("- Use the 50-30-20 rule: 50% needs, 30% wants, 20% savings.");
    appendMsg("- Try a no-spend week once a month!");
  }

  // Motivation
  else if (q.includes('motivat') || q.includes('goal')) {
    appendMsg("🚀 Reminder: Every ₹100 you save today becomes ₹200 tomorrow. Keep going!");
    appendMsg("Consistency in small saving habits builds a strong financial future.");
  }

  // Education / Students
  else if (q.includes('student')) {
    appendMsg("FinSmart Lab is specially made for students 🎓");
    appendMsg("You can track pocket money, plan expenses, and learn financial discipline easily.");
  }

  // Security
  else if (q.includes('secure') || q.includes('safety')) {
    appendMsg("✅ Don’t worry! Your data is stored locally in your browser’s storage.");
    appendMsg("No one else can access your data — it’s 100% safe for demo use.");
  }

  // Contact / Social
  else if (q.includes('contact') || q.includes('linkedin') || q.includes('github')) {
    appendMsg("You can reach our creator, Ankit Kumar:");
    appendMsg("📧 Email: ankitkr8651005671@gmail.com");
    appendMsg("🔗 GitHub: Ankit-Kumar8651 | LinkedIn: ankit-saini-106585329");
  }

  // Website Info
  else if (q.includes('website') || q.includes('webpage')) {
    appendMsg("This website is made using HTML, CSS, and JavaScript 🌐");
    appendMsg("It’s designed for a hackathon project showing real financial management concepts.");
  }

  // About / Project Info
  else if (q.includes('about') || q.includes('project')) {
    appendMsg("About FinSmart Lab:");
    appendMsg("✅ Built for students to manage personal finance easily.");
    appendMsg("✅ Tracks spending, calculates SIP, plans budget & savings.");
    appendMsg("✅ Created as part of hackathon 'RIT-CA03' by Ankit Kumar.");
  }

  // Greetings - Goodbye
  else if (q.includes('bye')) {
    appendMsg("Goodbye! 👋 Keep saving smartly with FinSmart Lab!");
  }

  // Thank You
  else if (q.includes('thank')) {
    appendMsg("You're most welcome 😊 Always here to help you with finance tips!");
  }

  // Default Response
  else {
    appendMsg("Hmm... I’m not sure about that 🤔");
    appendMsg("Try: 'help', 'what is SIP', 'how to save', or 'show summary'.");
  }
}


/* initial render */
renderAll();
