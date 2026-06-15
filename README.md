# not.mcompany

> Виртуальная корпоративная почта в чёрно-белых тонах. Open Source. Свободна как птица.

**Разработка:** [not.wteam](https://github.com/not-wteam)

## Особенности

- ⚫ Полностью чёрно-белый эстетичный интерфейс
- ✉️ Виртуальная почта — не требуется сервер
- 👑 Приказы босса обязательны для всех
- 💬 Личные сообщения между сотрудниками
- 🧩 Легко встраивается в любой проект
- 📦 Никаких зависимостей — чистый JS

## Быстрый старт

```html
<div id="mail"></div>
<script src="https://cdn.jsdelivr.net/gh/not-team/not.mcompany/src/not-mcompany.js"></script>
<script>
  const mail = new NotMCompany('mail', {
    companyName: 'Моя Компания',
    currentUser: { name: 'Иван Петров', role: 'Директор', email: 'ivan@mycompany' },
    employees: [
      { name: 'Анна Смирнова', role: 'HR', email: 'anna@mycompany', avatar: 'АС' }
    ]
  });
</script>
