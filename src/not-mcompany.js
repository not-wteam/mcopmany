 /**
 * not.mcompany
 * Виртуальная корпоративная почта в чёрно-белых тонах
 * Open Source · MIT License · Разработка: not.team
 * 
 * Свободно используйте, изменяйте, форкайте, встраивайте.
 * GitHub: https://github.com/not-team/not.mcompany
 */

(function(global) {
    'use strict';

    class NotMCompany {
        /**
         * Создаёт экземпляр виртуальной почты
         * @param {string} containerId - ID элемента, куда встроить почту
         * @param {Object} config - Конфигурация
         * @param {string} config.companyName - Название компании
         * @param {Object} config.currentUser - Текущий пользователь { name, role, email }
         * @param {Array} config.employees - Список сотрудников
         * @param {Array} [config.initialMessages] - Начальные сообщения
         * @param {Function} [config.onSendMessage] - Хук при отправке
         * @param {string} [config.theme='black-white'] - Тема оформления
         */
        constructor(containerId, config) {
            const container = document.getElementById(containerId);
            if (!container) throw new Error(`not.mcompany: container #${containerId} not found`);

            this.config = {
                companyName: config.companyName || 'NOT.MCOMPANY',
                currentUser: config.currentUser || { name: 'Сотрудник', role: 'Пользователь', email: 'user@local' },
                employees: config.employees || [],
                initialMessages: config.initialMessages || [],
                onSendMessage: config.onSendMessage || null,
                theme: config.theme || 'black-white',
                ...config
            };

            this.messages = [];
            this.selectedMessageId = null;
            this.container = container;

            this._initData();
            this._render();
            this._attachEvents();
        }

        // ========== ПУБЛИЧНОЕ API ==========

        /**
         * Отправить письмо
         * @param {string} toEmail - Email получателя или "all@company" для всех
         * @param {string} subject - Тема
         * @param {string} body - Текст
         * @param {Object} [options] - Опции { isOrder, fromOverride }
         * @returns {Object} Созданное сообщение
         */
        sendMessage(toEmail, subject, body, options = {}) {
            const { isOrder = false, fromOverride = null } = options;
            let sender = fromOverride 
                ? this.config.employees.find(e => e.email === fromOverride) 
                : this.config.currentUser;
            if (!sender) sender = this.config.currentUser;

            const isGlobal = toEmail === 'all@company' || toEmail === 'all';
            const recipient = this.config.employees.find(e => e.email === toEmail);
            const recipientName = isGlobal ? 'ВСЕМ СОТРУДНИКАМ' : (recipient?.name || 'Получатель');

            const newMessage = {
                id: this._generateId(),
                from: sender.name,
                fromEmail: sender.email,
                to: recipientName,
                toEmail: toEmail,
                subject: (isOrder || sender.isBoss) ? '⚠️ ' + subject : subject,
                body: body,
                date: new Date().toLocaleString(),
                read: false,
                isGlobal: isGlobal,
                isOrder: isOrder || sender.isBoss === true,
                isBossOrder: sender.isBoss === true
            };

            this.messages.unshift(newMessage);

            if (this.config.onSendMessage && typeof this.config.onSendMessage === 'function') {
                this.config.onSendMessage(newMessage);
            }

            this._renderEmailList();
            return newMessage;
        }

        /**
         * Отправить приказ от босса всем сотрудникам
         * @param {string} orderText - Текст приказа
         * @returns {Object|false} Созданное сообщение или false, если нет босса
         */
        sendOrderToAll(orderText) {
            const boss = this.config.employees.find(e => e.isBoss === true);
            if (!boss) {
                console.warn('not.mcompany: Нет босса в списке сотрудников. Добавьте сотрудника с isBoss: true');
                return false;
            }
            return this.sendMessage('all@company', orderText.slice(0, 60), orderText, {
                isOrder: true,
                fromOverride: boss.email
            });
        }

        /**
         * Добавить нового сотрудника
         * @param {Object} employee - { name, role, email, avatar, isBoss? }
         */
        addEmployee(employee) {
            if (!employee.avatar) employee.avatar = employee.name.charAt(0);
            this.config.employees.push(employee);
            this._renderContactList();
        }

        /**
         * Получить все сообщения
         * @returns {Array} Массив сообщений
         */
        getMessages() {
            return [...this.messages];
        }

        /**
         * Загрузить внешние сообщения (например, из базы)
         * @param {Array} newMessages - Массив сообщений
         */
        loadExternalMessages(newMessages) {
            this.messages = [...newMessages, ...this.messages];
            this._renderEmailList();
        }

        /**
         * Обновить всё (после внешних изменений)
         */
        refresh() {
            this._renderContactList();
            this._renderEmailList();
        }

        // ========== ПРИВАТНЫЕ МЕТОДЫ ==========

        _initData() {
            if (this.config.initialMessages.length) {
                this.messages = [...this.config.initialMessages];
            } else {
                this.messages = [];
                const boss = this.config.employees.find(e => e.isBoss);
                if (boss) {
                    this.messages.push({
                        id: this._generateId(),
                        from: boss.name,
                        fromEmail: boss.email,
                        to: 'ВСЕМ СОТРУДНИКАМ',
                        subject: '⚠️ ПРИКАЗ: Добро пожаловать в not.mcompany',
                        body: 'Уважаемые коллеги!\n\nЭто виртуальная корпоративная почта. Все приказы и сообщения носят демонстрационный характер.\n\nС уважением,\n' + boss.name,
                        date: new Date().toLocaleString(),
                        read: false,
                        isGlobal: true,
                        isOrder: true,
                        isBossOrder: true
                    });
                }
            }
        }

        _generateId() {
            return Date.now() + '-' + Math.random().toString(36).substr(2, 8);
        }

        _render() {
            this.container.innerHTML = `
                <div class="nmc-engine">
                    <div class="nmc-header">
                        <div class="nmc-logo">
                            <h1>${this._escapeHtml(this.config.companyName)}</h1>
                            <p>виртуальная почта · open source</p>
                        </div>
                        <div class="nmc-user">${this._escapeHtml(this.config.currentUser.name)} / ${this._escapeHtml(this.config.currentUser.role)}</div>
                    </div>
                    <div class="nmc-grid">
                        <div class="nmc-sidebar">
                            <div class="nmc-sidebar-title">▸ СОТРУДНИКИ</div>
                            <div class="nmc-contact-list" id="nmcContactList"></div>
                            <button id="nmcBossOrderBtn" class="nmc-order-btn">⚡ ПРИКАЗ (директор)</button>
                        </div>
                        <div class="nmc-main">
                            <div class="nmc-toolbar">
                                <button id="nmcNewMsgBtn" class="nmc-compose-btn">✎ НОВОЕ ПИСЬМО</button>
                                <span class="nmc-badge">✉ все сообщения</span>
                            </div>
                            <div class="nmc-email-list" id="nmcEmailList"></div>
                            <div class="nmc-detail-panel" id="nmcDetailPanel">
                                <div class="nmc-empty-detail">── выберите письмо для просмотра ──</div>
                            </div>
                        </div>
                    </div>
                    <div class="nmc-footer">
                        not.mcompany · MIT License · <a href="https://github.com/not-team/not.mcompany" target="_blank" style="color:#aaa;">github.com/not-team</a>
                    </div>
                </div>
                <div id="nmcModal" class="nmc-modal">
                    <div class="nmc-modal-card">
                        <div class="nmc-modal-header">
                            <span>НОВОЕ ПИСЬМО</span>
                            <span id="nmcCloseModal" class="nmc-modal-close">✕</span>
                        </div>
                        <div class="nmc-modal-body">
                            <select id="nmcRecipient">
                                <option value="">-- выберите сотрудника --</option>
                            </select>
                            <input type="text" id="nmcSubject" placeholder="Тема письма" value="Служебная записка">
                            <textarea id="nmcBody" rows="4" placeholder="Текст сообщения..."></textarea>
                            <div class="nmc-modal-actions">
                                <button id="nmcCancelModal" class="nmc-btn-light">Отмена</button>
                                <button id="nmcSendMsg" class="nmc-btn-dark">Отправить</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            this._injectStyles();
            this._renderContactList();
            this._renderEmailList();
            this._attachDynamicEvents();
        }

        _injectStyles() {
            if (document.getElementById('nmc-styles')) return;
            const style = document.createElement('style');
            style.id = 'nmc-styles';
            style.textContent = `
                .nmc-engine {
                    max-width: 1400px;
                    width: 100%;
                    background: #ffffff;
                    border: 1px solid #e0e0e0;
                    font-family: 'Inter', -apple-system, monospace;
                    margin: 0 auto;
                }
                .nmc-header {
                    background: #000000;
                    padding: 18px 28px;
                    display: flex;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 16px;
                }
                .nmc-logo h1 {
                    color: white;
                    font-size: 1.7rem;
                    font-weight: 500;
                    letter-spacing: -1px;
                }
                .nmc-logo p {
                    color: #aaa;
                    font-size: 0.7rem;
                }
                .nmc-user {
                    background: #181818;
                    padding: 6px 18px;
                    border: 0.5px solid #3a3a3a;
                    color: #ddd;
                    font-size: 0.8rem;
                }
                .nmc-grid { display: flex; min-height: 560px; }
                .nmc-sidebar {
                    width: 280px;
                    background: #fafafa;
                    border-right: 1px solid #e5e5e5;
                    padding: 20px 0;
                }
                .nmc-sidebar-title {
                    font-size: 0.7rem;
                    letter-spacing: 2px;
                    font-weight: 700;
                    padding: 0 20px 16px 20px;
                    border-bottom: 1px solid #ddd;
                    text-transform: uppercase;
                }
                .nmc-contact-list { margin-top: 8px; }
                .nmc-contact {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 20px;
                    cursor: pointer;
                    transition: 0.1s;
                }
                .nmc-contact:hover { background: #efefef; }
                .nmc-contact-avatar {
                    width: 36px;
                    height: 36px;
                    background: white;
                    border: 1px solid #ccc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                }
                .nmc-contact-info { flex: 1; }
                .nmc-contact-name { font-weight: 700; font-size: 0.85rem; }
                .nmc-contact-role { font-size: 0.65rem; color: #5a5a5a; }
                .nmc-contact-email { font-size: 0.6rem; color: #777; }
                .nmc-order-btn {
                    margin: 16px 20px 0;
                    width: calc(100% - 40px);
                    background: #1a1a1a;
                    color: white;
                    border: none;
                    padding: 8px;
                    font-family: monospace;
                    cursor: pointer;
                }
                .nmc-main { flex: 1; display: flex; flex-direction: column; }
                .nmc-toolbar {
                    padding: 12px 24px;
                    background: white;
                    border-bottom: 1px solid #ececec;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .nmc-compose-btn {
                    background: #000;
                    color: white;
                    border: none;
                    padding: 8px 24px;
                    font-family: monospace;
                    cursor: pointer;
                }
                .nmc-badge {
                    background: #f2f2f2;
                    padding: 4px 14px;
                    font-size: 0.7rem;
                    border: 0.5px solid #ccc;
                }
                .nmc-email-list {
                    flex: 1;
                    max-height: 360px;
                    overflow-y: auto;
                }
                .nmc-email-item {
                    padding: 14px 24px;
                    border-bottom: 1px solid #f0f0f0;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    flex-wrap: wrap;
                    gap: 10px;
                }
                .nmc-email-item.unread { background: #fefcf5; border-left: 3px solid #000; }
                .nmc-email-sender { font-weight: 700; min-width: 160px; }
                .nmc-email-subject { flex: 2; font-weight: 500; }
                .nmc-email-tag { background: #eaeaea; font-size: 0.65rem; padding: 2px 10px; }
                .nmc-email-tag.order { background: #000; color: white; }
                .nmc-email-date { color: #666; font-size: 0.7rem; min-width: 110px; text-align: right; }
                .nmc-detail-panel {
                    border-top: 1px solid #eaeaea;
                    background: #fdfdfd;
                    padding: 20px 24px;
                    max-height: 300px;
                    overflow-y: auto;
                }
                .nmc-empty-detail { text-align: center; color: #aaa; }
                .nmc-reply-area {
                    margin-top: 16px;
                    display: flex;
                    gap: 12px;
                }
                .nmc-reply-input {
                    flex: 1;
                    border: 1px solid #ccc;
                    padding: 10px;
                    font-family: monospace;
                }
                .nmc-reply-btn {
                    background: #000;
                    color: white;
                    border: none;
                    padding: 8px 18px;
                    cursor: pointer;
                }
                .nmc-footer {
                    background: #000;
                    color: #888;
                    text-align: center;
                    font-size: 0.7rem;
                    padding: 10px;
                }
                .nmc-footer a { color: #aaa; text-decoration: none; }
                .nmc-modal {
                    display: none;
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    background: rgba(0,0,0,0.7);
                    align-items: center;
                    justify-content: center;
                    z-index: 10000;
                }
                .nmc-modal-card {
                    background: white;
                    width: 500px;
                    max-width: 90%;
                    border: 1px solid #000;
                }
                .nmc-modal-header {
                    background: #000;
                    color: white;
                    padding: 14px 20px;
                    display: flex;
                    justify-content: space-between;
                }
                .nmc-modal-close { cursor: pointer; opacity: 0.7; }
                .nmc-modal-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
                .nmc-modal-body input, .nmc-modal-body select, .nmc-modal-body textarea {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #aaa;
                    font-family: monospace;
                }
                .nmc-modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
                .nmc-btn-dark { background: #000; color: white; border: none; padding: 6px 20px; cursor: pointer; }
                .nmc-btn-light { background: #e0e0e0; border: 1px solid #999; padding: 6px 20px; cursor: pointer; }
                @media (max-width: 700px) {
                    .nmc-grid { flex-direction: column; }
                    .nmc-sidebar { width: 100%; border-right: none; border-bottom: 1px solid #ddd; }
                }
            `;
            document.head.appendChild(style);
        }

        _renderContactList() {
            const container = document.getElementById('nmcContactList');
            if (!container) return;
            container.innerHTML = '';
            this.config.employees.forEach(emp => {
                const div = document.createElement('div');
                div.className = 'nmc-contact';
                div.innerHTML = `
                    <div class="nmc-contact-avatar">${this._escapeHtml(emp.avatar || emp.name.charAt(0))}</div>
                    <div class="nmc-contact-info">
                        <div class="nmc-contact-name">${this._escapeHtml(emp.name)} ${emp.isBoss ? '◉' : ''}</div>
                        <div class="nmc-contact-role">${this._escapeHtml(emp.role)}</div>
                        <div class="nmc-contact-email">${this._escapeHtml(emp.email)}</div>
                    </div>
                `;
                div.addEventListener('click', () => this._openComposeModal(emp.email));
                container.appendChild(div);
            });
        }

        _renderEmailList() {
            const container = document.getElementById('nmcEmailList');
            if (!container) return;
            if (this.messages.length === 0) {
                container.innerHTML = '<div style="padding:40px;text-align:center;color:#aaa;">Нет писем. Напишите первое сообщение.</div>';
                return;
            }
            container.innerHTML = '';
            this.messages.forEach(msg => {
                const item = document.createElement('div');
                item.className = `nmc-email-item ${!msg.read ? 'unread' : ''}`;
                const tagClass = msg.isOrder ? 'nmc-email-tag order' : 'nmc-email-tag';
                const tagText = msg.isOrder ? 'ПРИКАЗ' : 'личное';
                item.innerHTML = `
                    <div class="nmc-email-sender">${this._escapeHtml(msg.from)}</div>
                    <div class="nmc-email-subject">${this._escapeHtml(msg.subject)}</div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <span class="${tagClass}">${tagText}</span>
                        <div class="nmc-email-date">${this._escapeHtml(msg.date)}</div>
                    </div>
                `;
                item.addEventListener('click', () => {
                    msg.read = true;
                    this.selectedMessageId = msg.id;
                    this._renderEmailList();
                    this._showDetail(msg);
                });
                container.appendChild(item);
            });
        }

        _showDetail(msg) {
            const panel = document.getElementById('nmcDetailPanel');
            panel.innerHTML = `
                <div style="border-bottom:1px solid #eee; padding-bottom:12px;">
                    <h3 style="font-size:1.2rem;">${this._escapeHtml(msg.subject)}</h3>
                    <div style="font-size:0.75rem; color:#4a4a4a; margin-top:6px;">
                        От: ${this._escapeHtml(msg.from)} (${this._escapeHtml(msg.fromEmail)}) &nbsp;|&nbsp;
                        Кому: ${this._escapeHtml(msg.to)} &nbsp;|&nbsp;
                        ${this._escapeHtml(msg.date)}
                    </div>
                </div>
                <div style="margin:16px 0; white-space:pre-wrap; line-height:1.5;">${this._escapeHtml(msg.body).replace(/\n/g, '<br>')}</div>
                <div class="nmc-reply-area">
                    <textarea id="nmcReplyText" class="nmc-reply-input" rows="2" placeholder="Ответить..."></textarea>
                    <button id="nmcDoReply" class="nmc-reply-btn">↩ Ответить</button>
                </div>
            `;
            const replyBtn = document.getElementById('nmcDoReply');
            if (replyBtn) {
                replyBtn.addEventListener('click', () => {
                    const replyContent = document.getElementById('nmcReplyText')?.value;
                    if (!replyContent?.trim()) return alert('Введите ответ');
                    this.sendMessage(msg.fromEmail, `Re: ${msg.subject}`, replyContent);
                    alert('Ответ отправлен');
                    this._renderEmailList();
                    const replyTextarea = document.getElementById('nmcReplyText');
                    if (replyTextarea) replyTextarea.value = '';
                });
            }
        }

        _openComposeModal(prefillEmail = '') {
            const modal = document.getElementById('nmcModal');
            const select = document.getElementById('nmcRecipient');
            select.innerHTML = '<option value="">-- выберите сотрудника --</option>';
            this.config.employees.forEach(emp => {
                const opt = document.createElement('option');
                opt.value = emp.email;
                opt.textContent = `${emp.name} (${emp.role})`;
                if (emp.email === prefillEmail) opt.selected = true;
                select.appendChild(opt);
            });
            const allOpt = document.createElement('option');
            allOpt.value = 'all@company';
            allOpt.textContent = '📢 ВСЕМ СОТРУДНИКАМ';
            select.appendChild(allOpt);
            document.getElementById('nmcSubject').value = '';
            document.getElementById('nmcBody').value = '';
            modal.style.display = 'flex';
        }

        _attachDynamicEvents() {
            const modal = document.getElementById('nmcModal');
            const closeModal = () => { if (modal) modal.style.display = 'none'; };
            document.getElementById('nmcCloseModal')?.addEventListener('click', closeModal);
            document.getElementById('nmcCancelModal')?.addEventListener('click', closeModal);
            document.getElementById('nmcSendMsg')?.addEventListener('click', () => {
                const to = document.getElementById('nmcRecipient').value;
                const subject = document.getElementById('nmcSubject').value.trim();
                const body = document.getElementById('nmcBody').value.trim();
                if (!to) { alert('Выберите получателя'); return; }
                if (!subject) { alert('Введите тему'); return; }
                if (!body) { alert('Введите текст'); return; }
                this.sendMessage(to, subject, body);
                closeModal();
                this._renderEmailList();
                alert('Письмо отправлено');
            });
            document.getElementById('nmcNewMsgBtn')?.addEventListener('click', () => this._openComposeModal());
            document.getElementById('nmcBossOrderBtn')?.addEventListener('click', () => {
                const order = prompt('Введите текст ПРИКАЗА (обязателен для всех сотрудников):', 'С завтрашнего дня все отчёты сдаются в электронном виде.');
                if (order?.trim()) {
                    this.sendOrderToAll(order.trim());
                    alert('Приказ разослан всем сотрудникам.');
                    this._renderEmailList();
                }
            });
            window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        }

        _attachEvents() {}

        _escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>]/g, function(m) {
                if (m === '&') return '&amp;';
                if (m === '<') return '&lt;';
                if (m === '>') return '&gt;';
                return m;
            });
        }
    }

    global.NotMCompany = NotMCompany;
})(window);