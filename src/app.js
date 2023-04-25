// Copyright (C) 2023 Haiko Schol
// SPDX-License-Identifier: GPL-3.0-or-later

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

async function init() {
    try {
        const runs = await fetchRuns()
        document.getElementById('table-loader').hidden = true
        renderRuns(runs)
    } catch (e) {
        console.error(e)
    }
}

function renderRuns(runs) {
    const runList = document.getElementById('ort-run-list')

    for  (const run of runs) {
        const tr = makeRow(run)
        runList.append(tr)
    }
}

async function showDetailsDialog(title, bodyFn) {
    const bodyElem = document.getElementById('run-details-body')
    const loader = document.getElementById('run-details-loader')

    bodyElem.hidden = true
    loader.hidden = false

    openModal(document.getElementById('run-details-dialog'))

    const show = (body) => {
        loader.hidden = true
        bodyElem.hidden = false

        document.getElementById('run-details-title').innerText = title
        bodyElem.innerText = body
    }

    bodyFn().then(show).catch(show)
}

function showCreateDialog() {
    document.getElementById('repo-url-container').hidden = false
    document.getElementById('start-run-loader').hidden = true
    document.getElementById('start-run-ok').hidden = false
    document.getElementById('start-run-cancel').hidden = false

    openModal(document.getElementById('start-run-dialog'))
}

async function createRun() {
    document.getElementById('repo-url-container').hidden = true
    document.getElementById('start-run-loader').hidden = false
    document.getElementById('start-run-ok').hidden = true
    document.getElementById('start-run-cancel').hidden = true

    const repoUrl = document.getElementById('repo-url').value
    const body = JSON.stringify({RepoUrl: repoUrl})
    const response = await fetch(`${config.API_URL}/runs`, {method: 'POST', body: body})

    if (response.ok) {
        const run = await response.json()
        const tr = makeRow(run)
        const runList = document.getElementById('ort-run-list')
        runList.append(tr)
    } else {
        console.error(response.statusText)
    }

    closeModal(document.getElementById('start-run-dialog'))
}

function makeRow(run) {
    const tr = document.createElement('tr')
    const name = run.metadata.name
    const repoUrl = makeLink(run.spec.repoUrl)
    const [analyzer, scanner, reporter] = getStatuses(run)

    const detailsBodyFn = async () => new Promise((resolve, _) => resolve(JSON.stringify(run, null, '  ')))

    const runDetails = makeLink(
        name,
        '#run-details',
        'run-details-dialog',
        () => showDetailsDialog(`OrtRun ${name}`, detailsBodyFn)
    )

    appendCell(runDetails, tr)
    appendCell(repoUrl, tr)
    appendCell(analyzer, tr)
    appendCell(scanner, tr)
    appendCell(reporter, tr)

    return tr
}

function appendCell(content, tr) {
    const td = document.createElement('td')

    if (typeof content === 'string') {
        td.innerHTML = content
    } else {
        td.appendChild(content)
    }

    tr.appendChild(td)
}

function getStatuses(run) {
    if (!run.status) {
        return ['Pending', 'Pending', 'Pending']
    }

    const analyzer = makeStatusLink(run, 'analyzer')
    const scanner = makeStatusLink(run, 'scanner')
    const reporter = makeStatusLink(run, 'reporter')

    return [analyzer, scanner, reporter]
}

function makeStatusLink(run, stage) {
    const status = run.status[stage]

    if (status === 'Pending') {
        return status
    }

    if (stage === 'reporter' && status === 'Succeeded') {
        return makeLink(status, `${config.APP_URL}/${run.metadata.name}/`)
    }

    const fn = status === 'Succeeded' ? fetchResultFile : fetchLogs
    const detailsTitle = `${run.metadata.name} ${stage} ${status}`

    return makeLink(
        status,
        '#run-details',
        'run-details-dialog',
        async () => await showDetailsDialog(detailsTitle, () => fn(run.metadata.name, stage)),
    )
}

async function refreshRunList() {
    clearRunList()
    document.getElementById('table-loader').hidden = false
    try {
        const runs = await fetchRuns()
        document.getElementById('table-loader').hidden = true
        renderRuns(runs)
    } catch (e) {
        console.error(e)
        document.getElementById('table-loader').hidden = true
    }
}

async function fetchRuns() {
    const response = await fetch(`${config.API_URL}/runs`)
    if (!response.ok) {
        throw Error(response.statusText)
    }

    return (await response.json()).items
}

async function fetchLogs(name, stage) {
    const url = `${config.API_URL}/logs/${name}/${stage}`
    const response = await fetch(url)
    if (!response.ok) {
        throw Error(response.statusText)
    }

    return await response.text()
}

async function fetchResultFile(name, stage) {
    let url = `${config.APP_URL}/${name}`

    switch (stage) {
        case 'analyzer':
            url = `${url}/analyzer-result.yml`
            break
        case 'scanner':
            url = `${url}/scan-result.yml`
            break
        default:
            throw Error(`fetchResultFile(): unknown stage: "${stage}"`)
    }

    const response = await fetch(url)
    if (!response.ok) {
        throw Error(response.statusText)
    }

    return await response.text()
}

function clearRunList() {
    const runList = document.getElementById('ort-run-list')
    while (runList.rows.length > 0) {
        runList.deleteRow(0)
    }
}

function makeLink(text, href, dataTarget, onClickHandler) {
    const a = document.createElement('a')
    const textNode = document.createTextNode(text)

    a.href = href || text

    if (onClickHandler) {
        a.onclick = onClickHandler
    }

    if (dataTarget) {
        a.setAttribute('data-target', dataTarget)
    }

    a.appendChild(textNode)
    return a
}
