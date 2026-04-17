window.doLogin = async function doLogin() {
            const u = document.getElementById('login-user').value.trim();
            const p = document.getElementById('login-pass').value.trim();
            const errDiv = document.getElementById('login-error');
            const btn = document.getElementById('login-btn');
            
            if(!u || !p) { errDiv.innerText = "Please enter credentials"; return; }
            
            btn.disabled = true;
            btn.innerHTML = "Authenticating...";
            errDiv.innerText = "";
            
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: u, password: p})
                });
                const data = await res.json();
                if(data.success) {
                    localStorage.setItem('mas_auth_token', data.token);
                    document.getElementById('login-modal').style.opacity = '0';
                    setTimeout(() => { document.getElementById('login-modal').style.display = 'none'; }, 300);
                    if (window.socketInit) window.socketInit();
                    if (typeof loadProjects === 'function') loadProjects();
                } else {
                    errDiv.innerText = data.error || "Login failed";
                }
            } catch(e) {
                errDiv.innerText = "Network error";
            } finally {
                btn.disabled = false;
                btn.innerHTML = "Login";
            }
        };

