// Personal Finance Tracker - reactive, responsive, persists to localStorage
(() => {
	const monthSelect = document.getElementById('monthSelect');
	const yearSelect = document.getElementById('yearSelect');
	const expenseForm = document.getElementById('expenseForm');
	const nameInput = document.getElementById('name');
	const dateInput = document.getElementById('date');
	const amountInput = document.getElementById('amount');
	const expenseTableBody = document.querySelector('#expenseTable tbody');
	const periodTotalEl = document.getElementById('periodTotal');
	const allTotalEl = document.getElementById('allTotal');
	const filterLabel = document.getElementById('filterLabel');
	const clearBtn = document.getElementById('clearBtn');

	const STORAGE_KEY = 'expenses_v1';
	let expenses = [];

	function init(){
		populateMonthYear();
		dateInput.value = todayISO();
		load();
		render();
		monthSelect.addEventListener('change', render);
		yearSelect.addEventListener('change', render);
		expenseForm.addEventListener('submit', onSubmit);
		clearBtn.addEventListener('click', onClearAll);
	}

	function populateMonthYear(){
		const now = new Date();
		const months = ['All','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		months.forEach((m,i)=>{
			const opt = document.createElement('option');
			opt.value = i; // 0 means All
			opt.textContent = m;
			monthSelect.appendChild(opt);
		});

		// years: from now-5 to now+2
		const currentYear = now.getFullYear();
		const start = currentYear - 5;
		const end = currentYear + 2;
		const allOpt = document.createElement('option');
		allOpt.value = 'all';
		allOpt.textContent = 'All';
		yearSelect.appendChild(allOpt);
		for(let y=end;y>=start;y--){
			const o = document.createElement('option');
			o.value = String(y);
			o.textContent = y;
			yearSelect.appendChild(o);
		}

		// default to current
		monthSelect.value = String(now.getMonth()+1); // month index+1 so "All" is 0, Jan=1.. but we used values 0..12, so set to current month number
		// adjust because earlier we set option value as index; index 0 is 'All', so month number should be now.getMonth()+1
		yearSelect.value = String(currentYear);
	}

	function todayISO(){
		const d = new Date();
		return d.toISOString().slice(0,10);
	}

	function onSubmit(e){
		e.preventDefault();
		const name = nameInput.value.trim();
		const date = dateInput.value;
		const amount = parseFloat(amountInput.value);
		if(!name || !date || Number.isNaN(amount) || amount <= 0){
			alert('Please provide a valid name, date and amount (> 0).');
			return;
		}
		const item = { id: Date.now(), name, date, amount };
		expenses.push(item);
		save();
		render();
		expenseForm.reset();
		dateInput.value = todayISO();
		nameInput.focus();
	}

	function onClearAll(){
		if(!expenses.length) return alert('No records to clear.');
		if(confirm('Clear all expense records? This cannot be undone.')){
			expenses = [];
			save();
			render();
		}
	}

	function load(){
		try{
			const raw = localStorage.getItem(STORAGE_KEY);
			expenses = raw ? JSON.parse(raw) : [];
		}catch(err){
			console.error('Failed to load expenses', err);
			expenses = [];
		}
	}

	function save(){
		try{localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));}catch(e){console.error('save error',e)}
	}

	function render(){
		// compute filter
		const monthVal = Number(monthSelect.value); // 0 = All, 1..12 months
		const yearVal = yearSelect.value;

		const filtered = expenses.filter(it => {
			if(yearVal !== 'all' && String(new Date(it.date).getFullYear()) !== String(yearVal)) return false;
			if(monthVal && monthVal !== 0){
				// monthVal 1..12
				return (new Date(it.date).getMonth()+1) === monthVal;
			}
			return true;
		});

		// update labels and totals
		filterLabel.textContent = (monthVal && monthVal!==0 ? `${monthName(monthVal)} ` : '') + (yearVal==='all' ? '— All years' : yearVal);
		const periodTotal = filtered.reduce((s,i)=>s + Number(i.amount),0);
		const allTotal = expenses.reduce((s,i)=>s + Number(i.amount),0);
		periodTotalEl.textContent = formatCurrency(periodTotal);
		allTotalEl.textContent = formatCurrency(allTotal);

		// render table rows
		expenseTableBody.innerHTML = '';
		// sort descending by date
		filtered.sort((a,b)=> new Date(b.date) - new Date(a.date));
		for(const it of filtered){
			const tr = document.createElement('tr');
			tr.className = 'fade-in';
			const nameTd = document.createElement('td');
			nameTd.textContent = it.name;
			const dateTd = document.createElement('td');
			dateTd.textContent = formatDateLocal(it.date);
			const amtTd = document.createElement('td');
			amtTd.className = 'amount-col';
			amtTd.textContent = formatCurrency(it.amount);
			const actionsTd = document.createElement('td');
			actionsTd.className = 'actions';

			const delBtn = document.createElement('button');
			delBtn.className = 'btn';
			delBtn.textContent = 'Delete';
			delBtn.addEventListener('click', ()=> onDelete(it.id));

			const editBtn = document.createElement('button');
			editBtn.className = 'btn';
			editBtn.textContent = 'Edit';
			editBtn.addEventListener('click', ()=> onEdit(it.id));

			actionsTd.appendChild(editBtn);
			actionsTd.appendChild(delBtn);

			tr.appendChild(nameTd);
			tr.appendChild(dateTd);
			tr.appendChild(amtTd);
			tr.appendChild(actionsTd);

			expenseTableBody.appendChild(tr);
		}
	}
   // This will delete in the alert box
	function onDelete(id){
		if(confirm('Delete this record?')){
			expenses = expenses.filter(e => e.id !== id);
			save();
			render();
		}
	}
  //This will edit in the alert box
	function onEdit(id){
		const item = expenses.find(e => e.id === id);
		if(!item) return;
		const newName = prompt('Edit name', item.name);
		if(newName === null) return; // cancelled
		const newDate = prompt('Edit date (YYYY-MM-DD)', item.date);
		if(newDate === null) return;
		const newAmtStr = prompt('Edit amount', String(item.amount));
		if(newAmtStr === null) return;
		const newAmt = parseFloat(newAmtStr);
		if(!newName.trim() || !newDate || Number.isNaN(newAmt) || newAmt <= 0){
			alert('Invalid values — edit cancelled.');
			return;
		}
		item.name = newName.trim();
		item.date = newDate;
		item.amount = newAmt;
		save();
		render();
	}

	function formatCurrency(v){
		return v === 0 ? 'Rps0.00' : v.toLocaleString(undefined,{style:'currency',currency:'USD'});
	}

	function formatDateLocal(iso){
		const d = new Date(iso + 'T00:00:00');
		return d.toLocaleDateString();
	}

	function monthName(n){
		const m = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
		return m[n] || '';
	}

	// expose init
	init();

})();
