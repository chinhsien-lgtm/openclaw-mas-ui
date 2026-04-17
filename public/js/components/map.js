window.showBubble = function showBubble(id, text) {
            const safeId = id.replace(/ /g, '-');
            const bubble = document.getElementById(`bubble-${safeId}`);
            if(!bubble) return;
            bubble.innerText = text;
            bubble.classList.add('show');
            if(bubbleTimeouts[safeId]) clearTimeout(bubbleTimeouts[safeId]);
            bubbleTimeouts[safeId] = setTimeout(() => bubble.classList.remove('show'), 12000);
        };

