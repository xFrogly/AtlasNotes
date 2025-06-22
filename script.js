class AtlasNotes {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('atlas-notes')) || [];
        this.currentNote = null;
        this.currentCategory = 'all';
        this.isDarkMode = localStorage.getItem('atlas-theme') === 'dark';
        this.autoSaveTimeout = null;
        
        this.initializeElements();
        this.initializeEventListeners();
        this.initializeTheme();
        this.renderNotes();
        this.updateStats();
        this.updateCategories();
        
        if (this.notes.length === 0) {
            this.showWelcomeNote();
        }
    }

    initializeElements() {
        this.elements = {
            themeToggle: document.getElementById('themeToggle'),
            searchInput: document.getElementById('searchInput'),
            categoryList: document.getElementById('categoryList'),
            newNoteBtn: document.getElementById('newNoteBtn'),
            notesList: document.getElementById('notesList'),
            noteTitleInput: document.getElementById('noteTitleInput'),
            categorySelect: document.getElementById('categorySelect'),
            noteContent: document.getElementById('noteContent'),
            saveBtn: document.getElementById('saveBtn'),
            deleteBtn: document.getElementById('deleteBtn'),
            exportBtn: document.getElementById('exportBtn'),
            totalNotes: document.getElementById('totalNotes'),
            totalCategories: document.getElementById('totalCategories'),
            wordCount: document.getElementById('wordCount'),
            notification: document.getElementById('notification'),
            notificationText: document.getElementById('notificationText'),
            
            boldBtn: document.getElementById('boldBtn'),
            italicBtn: document.getElementById('italicBtn'),
            underlineBtn: document.getElementById('underlineBtn'),
            listBtn: document.getElementById('listBtn'),
            numberedListBtn: document.getElementById('numberedListBtn')
        };
    }

    initializeEventListeners() {
        this.elements.themeToggle.addEventListener('click', () => this.toggleTheme());
        
        this.elements.searchInput.addEventListener('input', (e) => this.searchNotes(e.target.value));
        
        this.elements.newNoteBtn.addEventListener('click', () => this.createNewNote());
        this.elements.saveBtn.addEventListener('click', () => this.saveNote());
        this.elements.deleteBtn.addEventListener('click', () => this.deleteNote());
        this.elements.exportBtn.addEventListener('click', () => this.exportNote());
        
        this.elements.noteTitleInput.addEventListener('input', () => this.handleAutoSave());
        this.elements.noteContent.addEventListener('input', () => {
            this.handleAutoSave();
            this.updateWordCount();
        });
        this.elements.categorySelect.addEventListener('change', () => this.handleAutoSave());
        
        this.elements.boldBtn.addEventListener('click', () => this.formatText('bold'));
        this.elements.italicBtn.addEventListener('click', () => this.formatText('italic'));
        this.elements.underlineBtn.addEventListener('click', () => this.formatText('underline'));
        this.elements.listBtn.addEventListener('click', () => this.insertList('bullet'));
        this.elements.numberedListBtn.addEventListener('click', () => this.insertList('numbered'));
        
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

    initializeTheme() {
        if (this.isDarkMode) {
            document.body.classList.add('dark');
            this.elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }

    toggleTheme() {
        this.isDarkMode = !this.isDarkMode;
        document.body.classList.toggle('dark');
        this.elements.themeToggle.innerHTML = this.isDarkMode 
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
        localStorage.setItem('atlas-theme', this.isDarkMode ? 'dark' : 'light');
    }

    showWelcomeNote() {
        const welcomeNote = {
            id: this.generateId(),
            title: 'Welcome to AtlasNotes',
            content: `# Welcome to AtlasNotes! 🗺️

AtlasNotes is your professional note management system designed to help you navigate your thoughts with precision.

## Features:
- **Rich Text Editing**: Format your notes with bold, italic, underline, and lists
- **Categories**: Organize your notes into custom categories
- **Search**: Quickly find any note with our powerful search
- **Dark Mode**: Toggle between light and dark themes
- **Auto-save**: Your work is automatically saved as you type
- **Export**: Export your notes to various formats
- **Keyboard Shortcuts**: Work efficiently with keyboard shortcuts

## Getting Started:
1. Click "New Note" to create your first note
2. Use the category dropdown to organize your notes
3. Try the formatting tools in the toolbar
4. Use Ctrl+S to save, Ctrl+N for new note

Start organizing your thoughts today!`,
            category: 'Getting Started',
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };
        
        this.notes.push(welcomeNote);
        this.saveToStorage();
        this.renderNotes();
        this.updateStats();
        this.updateCategories();
        this.selectNote(welcomeNote.id);
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    createNewNote() {
        const newNote = {
            id: this.generateId(),
            title: 'Untitled Note',
            content: '',
            category: 'General',
            createdAt: new Date().toISOString(),
            modifiedAt: new Date().toISOString()
        };
        
        this.notes.unshift(newNote);
        this.saveToStorage();
        this.renderNotes();
        this.updateStats();
        this.updateCategories();
        this.selectNote(newNote.id);
        this.elements.noteTitleInput.focus();
        this.elements.noteTitleInput.select();
    }

    selectNote(noteId) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;
        
        this.currentNote = note;
        this.elements.noteTitleInput.value = note.title;
        this.elements.noteContent.value = note.content;
        this.elements.categorySelect.value = note.category;
        
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-note-id="${noteId}"]`)?.classList.add('active');
        
        this.updateWordCount();
        this.updateDeleteButtonState();
    }

    saveNote() {
        if (!this.currentNote) return;
        
        this.currentNote.title = this.elements.noteTitleInput.value.trim() || 'Untitled Note';
        this.currentNote.content = this.elements.noteContent.value;
        this.currentNote.category = this.elements.categorySelect.value;
        this.currentNote.modifiedAt = new Date().toISOString();
        
        this.saveToStorage();
        this.renderNotes();
        this.updateStats();
        this.updateCategories();
        this.showNotification('Note saved successfully!', 'success');
    }

    handleAutoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(() => {
            if (this.currentNote) {
                this.saveNote();
            }
        }, 1000);
    }

    deleteNote() {
        if (!this.currentNote) return;
        
        if (!confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
            return;
        }
        
        this.notes = this.notes.filter(note => note.id !== this.currentNote.id);
        this.saveToStorage();
        this.renderNotes();
        this.updateStats();
        this.updateCategories();
        
        this.currentNote = null;
        this.elements.noteTitleInput.value = '';
        this.elements.noteContent.value = '';
        this.elements.categorySelect.value = 'General';
        this.updateWordCount();
        this.updateDeleteButtonState();
        
        this.showNotification('Note deleted successfully!', 'success');
    }

    exportNote() {
        if (!this.currentNote) return;
        
        const exportData = {
            title: this.currentNote.title,
            content: this.currentNote.content,
            category: this.currentNote.category,
            createdAt: this.currentNote.createdAt,
            modifiedAt: this.currentNote.modifiedAt
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.currentNote.title}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('Note exported successfully!', 'success');
    }

    searchNotes(query) {
        const filteredNotes = this.notes.filter(note => {
            const searchText = (note.title + ' ' + note.content + ' ' + note.category).toLowerCase();
            return searchText.includes(query.toLowerCase());
        });
        
        this.renderNotes(filteredNotes);
    }

    filterByCategory(category) {
        this.currentCategory = category;
        
        document.querySelectorAll('.category-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`)?.classList.add('active');
        
        if (category === 'all') {
            this.renderNotes();
        } else {
            const filteredNotes = this.notes.filter(note => note.category === category);
            this.renderNotes(filteredNotes);
        }
    }

    renderNotes(notesToRender = null) {
        const notes = notesToRender || this.notes;
        const notesList = this.elements.notesList;
        
        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sticky-note"></i>
                    <p>No notes found</p>
                    <small>Create your first note to get started</small>
                </div>
            `;
            return;
        }
        
        notesList.innerHTML = notes.map(note => {
            const preview = this.getContentPreview(note.content);
            const isActive = this.currentNote && this.currentNote.id === note.id;
            
            return `
                <div class="note-item ${isActive ? 'active' : ''}" data-note-id="${note.id}" onclick="atlasNotes.selectNote('${note.id}')">
                    <div class="note-header">
                        <h3 class="note-title">${this.escapeHtml(note.title)}</h3>
                        <span class="note-category">${this.escapeHtml(note.category)}</span>
                    </div>
                    <p class="note-preview">${this.escapeHtml(preview)}</p>
                    <div class="note-meta">
                        <small class="note-date">${this.formatDate(note.modifiedAt)}</small>
                        <small class="word-count">${this.getWordCount(note.content)} words</small>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateCategories() {
        const categories = [...new Set(this.notes.map(note => note.category))];
        categories.sort();
        
        const categoryList = this.elements.categoryList;
        categoryList.innerHTML = `
            <div class="category-item ${this.currentCategory === 'all' ? 'active' : ''}" data-category="all" onclick="atlasNotes.filterByCategory('all')">
                <i class="fas fa-list"></i>
                <span>All Notes</span>
                <span class="count">${this.notes.length}</span>
            </div>
        ` + categories.map(category => {
            const count = this.notes.filter(note => note.category === category).length;
            const isActive = this.currentCategory === category;
            
            return `
                <div class="category-item ${isActive ? 'active' : ''}" data-category="${category}" onclick="atlasNotes.filterByCategory('${category}')">
                    <i class="fas fa-folder"></i>
                    <span>${this.escapeHtml(category)}</span>
                    <span class="count">${count}</span>
                </div>
            `;
        }).join('');
        
        const categorySelect = this.elements.categorySelect;
        const currentValue = categorySelect.value;
        categorySelect.innerHTML = categories.map(category => 
            `<option value="${category}">${this.escapeHtml(category)}</option>`
        ).join('') + '<option value="new-category">+ New Category</option>';
        
        if (categories.includes(currentValue)) {
            categorySelect.value = currentValue;
        }
        
        categorySelect.addEventListener('change', (e) => {
            if (e.target.value === 'new-category') {
                const newCategory = prompt('Enter new category name:');
                if (newCategory && newCategory.trim()) {
                    const option = document.createElement('option');
                    option.value = newCategory.trim();
                    option.textContent = newCategory.trim();
                    categorySelect.insertBefore(option, categorySelect.lastElementChild);
                    categorySelect.value = newCategory.trim();
                }
            }
        });
    }

    updateStats() {
        this.elements.totalNotes.textContent = this.notes.length;
        const categories = [...new Set(this.notes.map(note => note.category))];
        this.elements.totalCategories.textContent = categories.length;
    }

    updateWordCount() {
        const content = this.elements.noteContent.value;
        const wordCount = this.getWordCount(content);
        this.elements.wordCount.textContent = `${wordCount} words`;
    }

    updateDeleteButtonState() {
        this.elements.deleteBtn.disabled = !this.currentNote;
        this.elements.exportBtn.disabled = !this.currentNote;
    }

    formatText(command) {
        const textarea = this.elements.noteContent;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        
        if (selectedText) {
            let formattedText;
            switch (command) {
                case 'bold':
                    formattedText = `**${selectedText}**`;
                    break;
                case 'italic':
                    formattedText = `*${selectedText}*`;
                    break;
                case 'underline':
                    formattedText = `<u>${selectedText}</u>`;
                    break;
            }
            
            textarea.value = textarea.value.substring(0, start) + formattedText + textarea.value.substring(end);
            textarea.focus();
            textarea.setSelectionRange(start + formattedText.length, start + formattedText.length);
            this.handleAutoSave();
        }
    }

    insertList(type) {
        const textarea = this.elements.noteContent;
        const start = textarea.selectionStart;
        const lines = textarea.value.split('\n');
        const currentLineIndex = textarea.value.substring(0, start).split('\n').length - 1;
        
        const listItem = type === 'bullet' ? '- ' : '1. ';
        lines[currentLineIndex] = listItem + lines[currentLineIndex];
        
        textarea.value = lines.join('\n');
        textarea.focus();
        textarea.setSelectionRange(start + listItem.length, start + listItem.length);
        this.handleAutoSave();
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 's':
                    e.preventDefault();
                    this.saveNote();
                    break;
                case 'n':
                    e.preventDefault();
                    this.createNewNote();
                    break;
                case 'f':
                    e.preventDefault();
                    this.elements.searchInput.focus();
                    break;
                case 'b':
                    e.preventDefault();
                    this.formatText('bold');
                    break;
                case 'i':
                    e.preventDefault();
                    this.formatText('italic');
                    break;
                case 'u':
                    e.preventDefault();
                    this.formatText('underline');
                    break;
            }
        }
    }

    hasUnsavedChanges() {
        if (!this.currentNote) return false;
        
        return (
            this.currentNote.title !== this.elements.noteTitleInput.value ||
            this.currentNote.content !== this.elements.noteContent.value ||
            this.currentNote.category !== this.elements.categorySelect.value
        );
    }

    showNotification(message, type = 'info') {
        this.elements.notificationText.textContent = message;
        this.elements.notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            this.elements.notification.classList.remove('show');
        }, 3000);
    }

    saveToStorage() {
        localStorage.setItem('atlas-notes', JSON.stringify(this.notes));
    }

    getContentPreview(content, maxLength = 100) {
        const cleanContent = content.replace(/[#*_<>]/g, '').trim();
        return cleanContent.length > maxLength 
            ? cleanContent.substring(0, maxLength) + '...'
            : cleanContent || 'No content';
    }

    getWordCount(text) {
        return text.trim() ? text.trim().split(/\s+/).length : 0;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays - 1} days ago`;
        
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.atlasNotes = new AtlasNotes();
});
