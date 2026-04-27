fetch('rss.xml')
    .then(response => {
        if (!response.ok) {
            throw new Error(`Failed to fetch RSS: ${response.status}`);
        }
        return response.text();
    })
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then(xml => {
        if (xml.querySelector('parsererror')) {
            throw new Error('Invalid RSS XML');
        }

        const titleSection = document.getElementById('feed-title-section');
        const footerSection = document.getElementById('feed-footer');
        const container = document.getElementById('feed-container');
        if (!titleSection || !container) {
            throw new Error('Required container elements are missing.');
        }

        const getByTag = (node, tagName) => {
            const direct = node.getElementsByTagName(tagName);
            if (direct && direct.length > 0) return Array.from(direct);

            // Fallback for namespaced tags when prefix handling is inconsistent.
            return Array.from(node.getElementsByTagName('*')).filter(el => {
                return `${el.prefix || ''}:${el.localName || ''}` === tagName || el.localName === tagName;
            });
        };

        const firstTextByTags = (node, tagNames, fallback = '') => {
            for (const tagName of tagNames) {
                const matches = getByTag(node, tagName);
                const value = matches[0]?.textContent?.trim();
                if (value) return value;
            }
            return fallback;
        };

        const collectTextsByTags = (node, tagNames) => {
            const values = [];
            tagNames.forEach(tagName => {
                getByTag(node, tagName).forEach(match => {
                    const value = match.textContent?.trim();
                    if (value) values.push(value);
                });
            });
            return values;
        };

        const rssNode = getByTag(xml, 'rss')[0] || xml.documentElement || xml;
        const angelaVersion =
            rssNode.getAttribute?.('angela:version') ||
            rssNode.getAttribute?.('version') ||
            firstTextByTags(xml, ['angela:version'], 'unknown');
        const channel = getByTag(xml, 'channel')[0] || xml;
        const rawTitle = firstTextByTags(channel, ['title'], '');
        const pubDateTime = firstTextByTags(channel, ['angela:pub_datetime'], '');
        const briefs = getByTag(channel, 'item');

        const itemCountMatch = rawTitle.match(/(\d+)건/);
        const itemCount = itemCountMatch ? itemCountMatch[1] : briefs.length;

        let formattedDate = '';
        const dtMatch = pubDateTime.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/);
        if (dtMatch) {
            const [, year, month, day] = dtMatch;
            formattedDate = `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
        }

        let publishedAtText = 'Published at unknown';
        if (dtMatch) {
            const [, year, month, day, hour, minute, second] = dtMatch;
            publishedAtText = `Published at ${year} ${month} ${day}-${hour}:${minute}:${second}`;
        }

        titleSection.innerHTML = `
            <h1>${formattedDate} - 창업지원 공고 ${itemCount}건 요약</h1>
        `;

        container.innerHTML = `<div class="published_date">${publishedAtText}</div>`;

        if (!briefs.length) {
            container.innerHTML += '<p>표시할 공고가 없습니다.</p>';
        }

        briefs.forEach(item => {
            const title = firstTextByTags(item, ['title'], 'Untitled');
            const description = firstTextByTags(item, ['description'], '');
            const dataSource = firstTextByTags(
                item,
                ['angela:data_source', 'data_source', 'angela:source', 'source'],
                ''
            );
            const eligibilities = collectTextsByTags(item, ['angela:eligibilities', 'anglea:eligibilities']);
            const benefits = collectTextsByTags(item, ['angela:benefits', 'anglea:benefits']);

            let detailHtml = '';
            if (description) {
                detailHtml += `<p>${description}</p>`;
            }
            if (eligibilities.length || benefits.length) {
                const sections = [];

                if (eligibilities.length) {
                    sections.push(`
                        <li>
                            지원대상
                            <ul>${eligibilities.map(text => `<li>${text}</li>`).join('')}</ul>
                        </li>
                    `);
                }

                if (benefits.length) {
                    sections.push(`
                        <li>
                            혜택
                            <ul>${benefits.map(text => `<li>${text}</li>`).join('')}</ul>
                        </li>
                    `);
                }

                detailHtml += `<ul>${sections.join('')}</ul>`;
            }
            if (!detailHtml) {
                detailHtml = '<p>상세 내용은 원문을 확인하세요.</p>';
            }

            const rawUrl = firstTextByTags(item, ['link'], '#');
            const url = /^(https?:|mailto:)/i.test(rawUrl) ? rawUrl : (rawUrl.includes('@') ? `mailto:${rawUrl}` : rawUrl);
            const isEmailLink = /^mailto:/i.test(url);
            const emailAddress = isEmailLink ? url.replace(/^mailto:/i, '') : '';
            const linkText = isEmailLink ? `연락처: ${emailAddress}` : '원문보기';
            const end_date = firstTextByTags(item, ['angela:end_date', 'end_date', 'pubDate'], '마감일 미정');

            const card = document.createElement('div');
            card.className = 'brief';
            card.innerHTML = `
                <div class="title">${title}</div>
                <div class="brief-actions">
                    ${dataSource ? `<span class="source">${dataSource}</span>` : ''}
                    (<a href="${url}" target="_blank" rel="noopener noreferrer">${linkText}</a>),
                    마감일자: ${end_date}
                </div>
                ${detailHtml}
            `;
            container.appendChild(card);
        });

        if (footerSection) {
            footerSection.textContent = `Collected & generated by Angela (ver. ${angelaVersion})`;
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
