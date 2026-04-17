let customDialogPromiseResolve = null;
function showCustomDialog(type, title, message, defaultValue = '') {
            return new Promise((resolve) => {
                // If it's a hitl modal, we inject raw HTML. Otherwise, we escape and linkify.
                let finalHtml = message;
                if (type !== 'hitl') {
                    // Escape basic HTML to prevent rendering bugs, then linkify and replace newlines
                    const escaped = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    finalHtml = escaped.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:#60a5fa; text-decoration:underline;">$1</a>').replace(/\n/g, '<br>');
                }

                document.getElementById('custom-dialog-title').innerText = title;
                document.getElementById('custom-dialog-actions').style.display = type === 'hitl' ? 'none' : 'flex';
                
                // Ensure standard dialog resets buttons
                document.getElementById('custom-dialog-cancel').style.display = (type === 'confirm' || type === 'prompt') ? 'inline-block' : 'none';
                document.getElementById('custom-dialog-confirm').style.display = type === 'hitl' ? 'none' : 'inline-block';
                
                if (type === 'prompt') {
                    document.getElementById('custom-dialog-input-container').style.display = 'block';
                    const inputEl = document.getElementById('custom-dialog-input');
                    inputEl.value = defaultValue;
                    setTimeout(() => inputEl.focus(), 50);
                    document.getElementById('custom-dialog-confirm').onclick = () => closeCustomDialog(document.getElementById('custom-dialog-input').value);
                } else {
                    document.getElementById('custom-dialog-input-container').style.display = 'none';
                    document.getElementById('custom-dialog-confirm').onclick = () => closeCustomDialog(true);
                }
                
                // Show "Send to Tech" button ONLY if the message contains error keywords and it's not a HITL prompt
                const isError = type !== 'hitl' && (message.toLowerCase().includes('failed') || message.toLowerCase().includes('error'));
                document.getElementById('custom-dialog-send-to-tech').style.display = isError ? 'inline-block' : 'none';
                
                document.getElementById('custom-dialog-message').innerHTML = finalHtml;
                
                document.getElementById('custom-dialog-modal').style.display = 'block';
                
                const cancelBtn = document.getElementById('custom-dialog-cancel');
                if (type === 'confirm') {
                    cancelBtn.style.display = 'inline-block';
                    document.getElementById('custom-dialog-box').style.borderColor = '#ef4444';
                    document.getElementById('custom-dialog-title').style.color = '#ef4444';
                    document.getElementById('custom-dialog-title').parentElement.style.borderBottomColor = '#ef4444';
                    document.getElementById('custom-dialog-confirm').style.background = '#ef4444';
                    document.getElementById('custom-dialog-confirm').style.color = 'white';
                } else {
                    cancelBtn.style.display = 'none';
                    document.getElementById('custom-dialog-box').style.borderColor = '#d4a373';
                    document.getElementById('custom-dialog-title').style.color = '#d4a373';
                    document.getElementById('custom-dialog-title').parentElement.style.borderBottomColor = '#d4a373';
                    document.getElementById('custom-dialog-confirm').style.background = '#d4a373';
                    document.getElementById('custom-dialog-confirm').style.color = 'black';
                }
                
                customDialogPromiseResolve = resolve;
                // Force focus on confirm
                setTimeout(() => document.getElementById('custom-dialog-confirm').focus(), 50);
            });
        };

window.closeCustomDialog = function closeCustomDialog(result) {
            document.getElementById('custom-dialog-modal').style.display = 'none';
            if (customDialogPromiseResolve) {
                if (result === false && document.getElementById('custom-dialog-input-container').style.display === 'block') {
                    // if they clicked cancel or X on prompt
                    customDialogPromiseResolve(null);
                } else {
                    customDialogPromiseResolve(result);
                }
                customDialogPromiseResolve = null;
            }
        };

window.sendDialogToTech = async function sendDialogToTech() {
            const errMessage = document.getElementById('custom-dialog-message').innerText;
            const promptText = `Team, I encountered the following deployment/push error. Please analyze this error log and fix the underlying issue immediately:\n\n${errMessage}`;
            
            // Put it into the chat input and auto-send
            document.getElementById('chat-input').value = promptText;
            closeCustomDialog(true);
            
            // Switch to GLOBAL view if not already there, then send
            setView('GLOBAL');
            setTimeout(() => sendBroadcast(), 100);
        };

window.customAlert = async function customAlert(message) {
            await showCustomDialog('alert', 'Notice', message);
        };

window.customConfirm = async function customConfirm(message) {
            return await showCustomDialog('confirm', 'Confirm Action', message);
        };

window.customPrompt = async function customPrompt(message, defaultValue = '') {
            return await showCustomDialog('prompt', 'Input Required', message, defaultValue);
        };




window.makeDraggable = function makeDraggable(boxId, headerId) {
    const elmnt = document.getElementById(boxId);
    const header = document.getElementById(headerId);
    if (!elmnt || !header) return;

    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    header.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        
        // If it still has transform center, convert to absolute position.
        // We use getComputedStyle because style.transform might be empty if set by CSS class.
        const computedStyle = window.getComputedStyle(elmnt);
        if (computedStyle.transform !== 'none') {
            const rect = elmnt.getBoundingClientRect();
            // First remove transform
            elmnt.style.transform = 'none';
            // Also unset right/bottom to prevent stretching
            elmnt.style.right = 'auto';
            elmnt.style.bottom = 'auto';
            // Now set top and left strictly to the bounding rect
            elmnt.style.top = rect.top + 'px';
            elmnt.style.left = rect.left + 'px';
        }

        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    window.makeDraggable('login-wrapper', 'login-header');
    window.makeDraggable('app-manager-box', 'app-manager-header');
    window.makeDraggable('github-push-box', 'github-push-header');
    window.makeDraggable('custom-dialog-box', 'custom-dialog-header');
    window.makeDraggable('doc-viewer-box', 'doc-viewer-header');
});
