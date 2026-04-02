const { error } = require('console');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));

const DATA_PATH = path.join(__dirname, 'data', 'records.json');

//Зчитування даних з БД
function readData(){
    try{
        if(!fs.existsSync(DATA_PATH)){
            return [];
        }
        const data = fs.readFileSync(DATA_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Помилка читання даних: ', e);
        return [];
    }
}

// Запис даних в БД
function writeData(data){
    try{
        const dir = path.dirname(DATA_PATH);
        if(!fs.existsSync(dir)){
            fs.mkdirSync(dir, {recursive: true});
        }

        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('Помилка запису даних:', error);
        return false;
    }
}

// GET Запит для отримання записів
app.get('/api/diagnostics', (req, res) => {
    const records = readData();
    res.json(records);
});

// POST Запит для створення та запису в БД
app.post('/api/diagnostics', (req, res) => {
    try{
        const { type, equipmentNumber, substation, results, notify } = req.body;

        const regex = /^[A-Za-zА-Яа-яІіЇїЄєҐґ0-9\-]{3,15}$/;
        if (!regex.test(equipmentNumber)){
            return res.status(400).json({ 
                success: false, 
                message: 'Помилка: Недійсний формат інвентарного номера' 
            });
        }

        if (!substation || substation.length < 5 || substation.length > 100) {
            return res.status(400).json({ 
                success: false, 
                message: 'Помилка: Назва підстанції має бути від 5 до 100 символів' 
            });
        }

        const newRecord = {
            id: Date.now().toString(),
            type: req.body.type,
            equipmentNumber: req.body.equipmentNumber,
            substation: req.body.substation,
            results: req.body.results,
            notify: req.body.notify === 'on', 
            date: new Date().toISOString(), 
        }

        const records = readData();
        records.push(newRecord);

        if (writeData(records)){
            res.status(201).json({
                success: true,
                message: newRecord.notify ? 'Запис додано. Відправлено сповіщення!' : 'Запис діагностики успішно збережено',
                data: newRecord,
            });
        } else {
            throw new Error('Помилка запису даних');
        }
    } catch (e) {
        res.status(500).json({
            success: false,
            message: 'Помилка запису даних',
            error: e.message
        });
    }
});

// DELETE запит для видалення запису з БД
app.delete('/api/diagnostics/:id', (req, res) =>{
    try {
        const records = readData();
        const updatedRecord = records.filter(r => r.id !== req.params.id);

        if(writeData(updatedRecord)){
            res.json({ success: true, message: 'Запис видалено' });
        } else {
            throw new Error('Помилка запису даних');
        }
    } catch (e) {
        res.status(500).json({
            success: false,
            message: 'Помилка видалення даних',
            error: e.message
        });
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`server run: http://localhost:${PORT}`);
});