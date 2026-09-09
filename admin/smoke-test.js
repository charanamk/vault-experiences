const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

(async function(){
    try{
        const root = path.resolve(__dirname);
        const htmlPath = path.join(root, 'tickets.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        // Strip <script> tags from the HTML to avoid auto-executing page scripts twice in jsdom
        html = html.replace(/<script[\s\S]*?<\/script>/gi, '');

        const dom = new JSDOM(html, {
            runScripts: 'dangerously',
            resources: 'usable',
            url: 'file:///' + root.replace(/\\/g, '/') + '/tickets.html'
        });

        const { window } = dom;
        const { document } = window;

        // Inject ticket-edit and tickets modules only if VaultTickets not already defined
        if(!window.VaultTickets){
            const filesToInject = [
                path.join(root, 'modules-js', 'ticket-edit.js'),
                path.join(root, 'modules-js', 'tickets.js')
            ];

            for(const f of filesToInject){
                const code = fs.readFileSync(f, 'utf8');
                const s = document.createElement('script');
                s.textContent = code;
                document.body.appendChild(s);
            }

            // wait briefly for scripts to run
            await new Promise(r => setTimeout(r, 300));
        } else {
            console.log('SMOKE_TEST: VaultTickets already defined — skipping injection');
            // give already-loaded scripts a moment to initialize
            await new Promise(r => setTimeout(r, 200));
        }

        const addBtn = document.getElementById('addTicketBtn');
        if(!addBtn){
            console.error('SMOKE_TEST: FAIL - Add Ticket button not found');
            process.exit(2);
        }

        // Click Add
        addBtn.click();

        await new Promise(r => setTimeout(r, 200));

        const ticketEditor = document.getElementById('ticketEditor');
        const isOpen = ticketEditor && ticketEditor.classList.contains('is-open');
        if(!isOpen){
            console.error('SMOKE_TEST: FAIL - Editor did not open');
            process.exit(3);
        }

        // Fill form
        const name = document.getElementById('editTicketName');
        const price = document.getElementById('editTicketPrice');
        const capacity = document.getElementById('editTicketCapacity');
        if(!name || !price || !capacity){
            console.error('SMOKE_TEST: FAIL - Editor inputs missing');
            process.exit(4);
        }

        name.value = 'Smoke Test Ticket';
        price.value = '1200';
        capacity.value = '50';

        // Submit form by dispatching submit event
        const form = document.getElementById('ticketEditorForm');
        if(!form){
            console.error('SMOKE_TEST: FAIL - Editor form not found');
            process.exit(5);
        }

        const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);

        await new Promise(r => setTimeout(r, 300));

        const cards = document.querySelectorAll('.ticket-management-card');
        if(cards.length === 0){
            console.error('SMOKE_TEST: FAIL - No ticket card created');
            process.exit(6);
        }

        console.log('SMOKE_TEST: PASS - ticket cards:', cards.length);
        process.exit(0);

    }catch(err){
        console.error('SMOKE_TEST: ERROR', err);
        process.exit(1);
    }
})();
