fetch('rss.xml')
    .then(response => response.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then(xml => {
        const titleSection = document.getElementById('feed-title-section');
        const footerSection = document.getElementById('feed-footer');
        const container = document.getElementById('feed-container');
        if (!titleSection || !container) {
            throw new Error('Required container elements are missing.');
        }

        const angelaVersion = xml.querySelector("angela-version")?.textContent?.trim() || "unknown";
        const summaryTitle = xml.querySelector("summary_title")?.textContent?.trim() || "Government Support Feed";
        const summaryDescription = xml.querySelector("description")?.textContent?.trim() || "Latest curated notices";
        const briefs = xml.querySelectorAll("brief");

        titleSection.innerHTML = `
            <h1>${summaryTitle}</h1>
            <p>${summaryDescription}</p>
        `;

        container.innerHTML = '';

        briefs.forEach(item => {
            const title = item.querySelector("project-title").textContent;
            const desc = item.querySelector("project-desc").textContent;
            const url = item.querySelector("url").textContent;
            const end_date = item.querySelector("end_date").textContent;

            const card = document.createElement('div');
            card.className = 'brief';
            card.innerHTML = `
                <div class="title">${title}</div>
                <div class="meta">${end_date}</div>
                <p>${desc}</p>
                <a href="${url}" target="_blank" rel="noopener noreferrer">원문보기</a>
            `;
            container.appendChild(card);
        });

        if (footerSection) {
            footerSection.textContent = `Created by Angela (${angelaVersion})`;
        }
    })
    .catch(() => {
        const titleSection = document.getElementById('feed-title-section');
        if (titleSection) {
            titleSection.innerHTML = `
                <h1>ERROR: Unable to load summary data.</h1>
            `;
        }
    });
