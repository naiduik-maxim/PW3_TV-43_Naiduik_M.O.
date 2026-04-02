const form = document.getElementById('diagnostic');
const messageBlock = document.getElementById('message');
const recordsList = document.getElementById('recordsList')

// Відображати дані тільки тоді коли завантажились на сайт
document.addEventListener('DOMContentLoaded', loadRecords);

// Обробник події відправки форми (submit).
// Перехоплює стандартну поведінку форми, збирає дані та відправляє їх на сервер.
form.addEventListener('submit', async (e) =>{
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData);

    if(!data.notify) data.notify = 'off';

    try{
        const response = await fetch('/api/diagnostics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const results = await response.json();

        if (results.success){
            showMessage('success', 'Запис успішно створено');
            form.reset();
            loadRecords();
        } else {
            showMessage('error', results.message);
        }
    } catch (e) {
        showMessage('error', 'Помилка з\'єднання з сервером');
    }
});

// Функція для завантаження історії діагностики з сервера.
async function loadRecords() {
    try{
        const response = await fetch('/api/diagnostics');
        const result = await response.json();
        displayRecords(result);
    } catch (e) {
        console.error('Error loading records:', e);
    }
}

//Функція для рендеру (відображення) масиву записів на веб-сторінці.
function displayRecords(records){
    if(records.length === 0){
        recordsList.innerHTML = '<p style="color: #999;">Історія діагностики порожня</p>';
        return;
    } 
    recordsList.innerHTML = records.reverse().map(record => `
        <div class="record-card ${record.notify ? 'critical' : ''}">
            ${record.notify ? '<span class="alert-badge">Критично</span>' : ''}
            <h3>Обладнання № ${record.equipmentNumber}</h3>
            <p><span class="label">Тип:</span> ${getTypeName(record.type)}</p>
            <p><span class="label">Підстанція:</span> ${record.substation}</p>
            <p><span class="label">Результати:</span> ${record.results}</p>
            <p><span class="label">Дата перевірки:</span> ${new Date(record.date).toLocaleString('uk-UA')}</p>
            <button class="btn btn-delete" onclick="deleteRecord('${record.id}')" style="margin-top: 10px;">Видалити</button>
        </div>
    `).join('');
}

// Функція для видалення запису з бази даних.
async function deleteRecord(id) {
    if(!confirm('Ви впевнені що хочете видалити цей запис з історії?')) return;
    try {
        const response = await fetch(`/api/diagnostics/${id}`,{
            method: 'DELETE',
        });
        const result = await response.json();

        if (result.success){
            showMessage('success', 'Запис успішно видалено');
            loadRecords();
        } else {
            showMessage('error', 'Помилка видалення');
        }
    } catch (e) {
        showMessage('error', 'Помилка з\'єднання з сервером');
    }
}

// Функція для відображення спливаючих сповіщень.
function showMessage(type, message){
    messageBlock.className = type;
    messageBlock.textContent = message;
    messageBlock.style.display = 'block';
    setTimeout(() => {
        messageBlock.classList.add('fade-out');
        
        setTimeout(() => {
            messageBlock.style.display = 'none';
            messageBlock.classList.remove('fade-out');
        }, 500); 
    }, 5000);
}

//Допоміжна (утилітарна) функція для перекладу технічних ключів у зрозумілий текст.
function getTypeName(type) {
    const types = {
        'transformer': 'Силовий трансформатор',
        'breaker': 'Вимикач',
        'disconnector': 'Роз\'єднувач',
        'line': 'Лінія електропередачі'
    };
    return types[type] || type;
}