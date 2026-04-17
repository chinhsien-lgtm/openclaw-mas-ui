window.renderInventory = function() {
            if (!window.MAS_STATE || !window.MAS_STATE.files) return;
            const bar = document.getElementById('inventory-bar');
            if(!bar) return;
            bar.innerHTML = '';
            for(let i=0; i < window.MAS_STATE.files.length; i++) {
                const f = window.MAS_STATE.files[i];
                const slot = document.createElement('div');
                slot.style.cssText = "display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); padding:6px 12px; border-radius:6px; cursor:pointer; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:12px; color:#e5e7eb; transition:all 0.2s ease; position:relative;";
                slot.onmouseover = () => { slot.style.background = 'rgba(255,255,255,0.12)'; slot.style.transform = 'translateY(-2px)'; slot.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'; };
                slot.onmouseout = () => { slot.style.background = 'rgba(255,255,255,0.06)'; slot.style.transform = 'translateY(0)'; slot.style.boxShadow = 'none'; };
                
                let icon = '📄';
                if(f.name.endsWith('.md')) icon = '📝';
                if(f.name.endsWith('.zip')) icon = '📦';
                if(f.name.endsWith('.json')) icon = '⚙️';
                if(f.type === 'image') icon = '🖼️';
                
                slot.innerHTML = `<span style="font-size:14px;">${icon}</span><span style="max-width:140px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${f.name}</span>`;
                slot.onclick = () => window.viewDocument(i);
                bar.appendChild(slot);
            }
        };

window.isInventoryExpanded = false;
window.toggleInventory = function() {
            const bar = document.getElementById('inventory-bar');
            const btn = document.getElementById('inventory-expand-btn');
            if(!bar || !btn) return;
            window.isInventoryExpanded = !window.isInventoryExpanded;
            if (window.isInventoryExpanded) {
                bar.style.maxHeight = '300px';
                bar.style.overflowY = 'auto';
                btn.innerText = '▲';
                btn.style.background = 'rgba(52,211,153,0.2)';
                btn.style.color = '#34d399';
            } else {
                bar.style.maxHeight = '56px';
                bar.style.overflowY = 'hidden';
                btn.innerText = '▼';
                btn.style.background = 'rgba(30, 30, 34, 0.9)';
                btn.style.color = '#888';
            }
        };

window.toggleFileMenu = function toggleFileMenu(index, event) {
            event.stopPropagation();
            const menus = document.querySelectorAll('[id^="file-menu-"]');
            menus.forEach(m => m.style.display = 'none');
            const menu = document.getElementById(`file-menu-${index}`);
            if (menu) menu.style.display = 'block';
        };

window.viewDocument = function viewDocument(index) {
            const f = window.MAS_STATE.files[index];
            if (!f || f.name.includes('.zip')) return;
            
            if (f.type === 'image') {
                document.getElementById('doc-viewer-title').innerText = f.name;
                document.getElementById('doc-viewer-content').innerHTML = `<img src="${f.content || f.url}" style="max-width:100%; border-radius:4px;">`;
                document.getElementById('doc-viewer-modal').style.display = 'block';
                return;
            }
            
            let text = '';
            let rawContent = f.content || f.url || '';
            
            // If the content is stored as base64 internally (e.g. data:text/markdown;base64,...)
            if (rawContent.startsWith('data:') && rawContent.includes('base64,')) {
                const base64Data = rawContent.split('base64,')[1];
                try {
                    text = decodeURIComponent(escape(window.atob(base64Data)));
                } catch(e) {
                    try { text = window.atob(base64Data); } catch(e2) { text = "Error decoding document"; }
                }
            } else {
                text = rawContent;
            }
            
            let htmlText = 'Error parsing markdown';
            if (typeof marked !== 'undefined') {
                htmlText = marked.parse(text);
            } else {
                htmlText = text
                    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                    .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
                    .replace(/\n/gim, '<br>');
            }

            document.getElementById('doc-viewer-title').innerText = f.name;
            document.getElementById('doc-viewer-content').innerHTML = htmlText;
            document.getElementById('doc-viewer-modal').style.display = 'block';
        };

window.deleteDeliverable = async function deleteDeliverable(name) {
            if(!await customConfirm('Delete this file from inventory?')) return;
            await fetch('/api/deliverables/delete', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name })
            });
        };

