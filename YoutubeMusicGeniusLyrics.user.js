// ==UserScript==
// @name            Youtube Music Genius Lyrics
// @description     Shows lyrics/songtexts from genius.com on Youtube music next to music videos
// @description:es  Mostra la letra de genius.com de las canciones en Youtube Music
// @description:de  Zeigt den Songtext von genius.com auf Youtube Music an
// @description:fr  Présente les paroles de chansons de genius.com sur Youtube Music
// @description:pl  Pokazuje teksty piosenek z genius.com na Youtube Music
// @description:pt  Mostra letras de genius.com no Youtube Music
// @description:it  Mostra i testi delle canzoni di genius.com su Youtube Music
// @description:ja  YouTube Music（ユーチューブ ミュージック）プレーヤーで、スクリプトが genius.com の歌詞を表示する
// @license         GPL-3.0-or-later; http://www.gnu.org/licenses/gpl-3.0.txt
// @copyright       2020, cuzi (https://github.com/cvzi)
// @author          cuzi
// @supportURL      https://github.com/cvzi/Youtube-Music-Genius-Lyrics-userscript/issues
// @updateURL       https://openuserjs.org/meta/cuzi/Youtube_Music_Genius_Lyrics.meta.js
// @version         4.0.5
// @require         https://openuserjs.org/src/libs/cuzi/GeniusLyrics.js
// @grant           GM.xmlHttpRequest
// @grant           GM.setValue
// @grant           GM.getValue
// @grant           GM.registerMenuCommand
// @grant           unsafeWindow
// @connect         genius.com
// @include         https://music.youtube.com/*
// ==/UserScript==

/*
    Copyright (C) 2020 cuzi (cuzi@openmail.cc)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

/* global GM, genius, unsafeWindow, geniusLyrics */ // eslint-disable-line no-unused-vars

'use strict'

const SCRIPT_NAME = 'Youtube Music Genius Lyrics'
let lyricsWidth = '40%'

function addCss () {
  // Spotify
  document.head.appendChild(document.createElement('style')).innerHTML = `
  #lyricscontainer {
    position:fixed;
    right:0px;
    margin:0px;
    padding:0px;
    background:#000;
    color:#fff;
    z-index:101;
    font-size:1.4rem;
    border:none;
    border-radius:none;
  }
  .lyricsiframe {
    opacity:0.1;
    transition:opacity 2s;
    margin:0px;
    padding:0px;
  }
  .lyricsnavbar {
    font-size : 0.7em;
    text-align:right;
    padding-right:10px;
    background:#212121;
   }
  .lyricsnavbar span,.lyricsnavbar a:link,.lyricsnavbar a:visited  {
    color:#d5d5d5;
    text-decoration:none;
    transition:color 400ms;
   }
  .lyricsnavbar a:hover,.lyricsnavbar span:hover {
    color:#fff;
    text-decoration:none;
  }
  .loadingspinner {
      color:white;
      font-size:1em;
      line-height:2.5em;
  }
  .loadingspinnerholder {
    z-index:101;
    background-color:transparent;
    position:absolute;
    top:120px;
    right:100px;
    cursor:progress
  }
  .lorem {padding:10px 0px 0px 15px; font-size: 1.4rem;line-height: 2.2rem;letter-spacing: 0.3rem;}
  .lorem .white {background:black;color:black}
  .lorem .gray {background:#7f7f7f;color:#7f7f7f}
  #lyricscontainer.geniusSearch {
    background:#212121;
  }
  #lyricscontainer.geniusSearch a:link, #lyricscontainer.geniusSearch a:visited{
    color:#909090;
    transition:color 300ms;
    text-decoration:none;
    font-size:16px
  }
  #lyricscontainer.geniusSearch a:hover{
    color:white;
  }
  .geniussearchinput {
    background-color:#212121;
    color:white;
    border:1px solid #333;
    font-size:17px;
    padding:7px;
    min-width: 60%;
  }
  `
}

function calcContainerWidthTop () {
  const playerPage = document.querySelector('ytmusic-player-page#player-page')
  const bar = document.querySelector('#lyricscontainer .lyricsnavbar')
  const dim = playerPage.getBoundingClientRect()
  const left = dim.left + dim.width
  const top = dim.top - (bar ? bar.getBoundingClientRect().height : 11)
  return [left, top]
}

function setFrameDimensions (container, iframe) {
  const bar = container.querySelector('.lyricsnavbar')
  const ytmusicPlayerBarDim = document.querySelector('ytmusic-player-bar').getBoundingClientRect()
  const progressContainer = document.getElementById('progressContainer')
  const width = iframe.style.width = container.clientWidth - 1 + 'px'
  const height = iframe.style.height = window.innerHeight - 2 -
  (bar ? bar.getBoundingClientRect().height : 11) -
  container.getBoundingClientRect().top -
  (progressContainer ? progressContainer.getBoundingClientRect().height : 3) -
  ytmusicPlayerBarDim.height + 'px'

  if (genius.option.themeKey === 'spotify') {
    iframe.style.backgroundColor = 'black'
  } else {
    iframe.style.backgroundColor = ''
  }

  return [width, height]
}

function onResize () {
  window.setTimeout(function () {
    genius.option.resizeOnNextRun = true
  }, 200)
}

function resize () {
  const container = document.getElementById('lyricscontainer')
  const iframe = document.getElementById('lyricsiframe')

  if (!container) {
    return
  }

  const [left, top] = calcContainerWidthTop()

  container.style.top = top + 'px'
  container.style.left = left + 'px'

  if (iframe) {
    setFrameDimensions(container, iframe)
  }
}

function getCleanLyricsContainer () {
  let container

  const playerPage = document.querySelector('ytmusic-player-page#player-page')
  const playerPageDiv = playerPage.querySelector('.ytmusic-player-page')
  playerPage.style.width = `calc(100% - ${lyricsWidth})`

  playerPageDiv.dataset.paddingRight = window.getComputedStyle(playerPageDiv).paddingRight
  playerPageDiv.style.paddingRight = '0px'

  const [left, top] = calcContainerWidthTop()

  if (!document.getElementById('lyricscontainer')) {
    container = document.createElement('div')
    container.id = 'lyricscontainer'
    document.body.appendChild(container)
  } else {
    container = document.getElementById('lyricscontainer')
    container.innerHTML = ''
  }
  container.style = ''
  container.style.top = top + 'px'
  container.style.left = left + 'px'
  container.className = ''

  return document.getElementById('lyricscontainer')
}

function hideLyrics () {
  document.querySelectorAll('.loadingspinner').forEach((spinner) => spinner.remove())
  if (document.getElementById('lyricscontainer')) {
    document.getElementById('lyricscontainer').remove()
  }

  const playerPage = document.querySelector('ytmusic-player-page#player-page')
  const playerPageDiv = playerPage.querySelector('.ytmusic-player-page')

  playerPage.style.width = ''
  playerPageDiv.style.paddingRight = playerPageDiv.dataset.paddingRight

  addLyricsButton()
}

function addLyricsButton () {
  if (document.getElementById('showlyricsbutton')) {
    return
  }
  const b = document.createElement('div')
  b.setAttribute('id', 'showlyricsbutton')
  b.setAttribute('style', 'position:absolute;top:1px;right:0px;color:#ffff64;cursor:pointer;z-index:3000;background:black;border-radius:50%;margin:auto;text-align:center;font-size:15px;line-height:15px;')
  b.setAttribute('title', 'Load lyrics from genius.com')
  b.appendChild(document.createTextNode('🅖'))
  b.addEventListener('click', function onShowLyricsButtonClick () {
    genius.option.autoShow = true // Temporarily enable showing lyrics automatically on song change
    window.clearInterval(genius.iv.main)
    genius.iv.main = window.setInterval(main, 2000)
    b.remove()
    addLyrics(true)
  })
  document.body.appendChild(b)
  if (b.clientWidth < 10) {
    b.setAttribute('style', 'position:absolute; top: 0px; right:0px; background-color:black; color:#ffff64; cursor:pointer; z-index:3000;border:1px solid #ffff64;border-radius: 100%;padding: 0px 3px;font-size: 12px;')
    b.innerHTML = 'G'
  }
}

let lastSong = null
function addLyrics (force, beLessSpecific) {
  const titleNode = document.querySelector('.ytmusic-player-bar .title.ytmusic-player-bar')
  const artistNodes = document.querySelectorAll('.ytmusic-player-bar.subtitle a[href*="channel/"]')
  if (!titleNode || !titleNode.textContent || artistNodes.length === 0) {
    // No song is playing
    lastSong = null
    hideLyrics()
    return
  }

  let songTitle = titleNode.textContent
  const songArtistsArr = Array.from(artistNodes).map(e => e.textContent)

  const song = songArtistsArr.join(', ') + ' - ' + songTitle + '#' + genius.option.themeKey + '@' + lyricsWidth

  if (lastSong === song && document.getElementById('lyricscontainer')) {
    // Same video id and same theme and lyrics are showing -> stop here
    return
  } else {
    lastSong = song
  }

  songTitle = songTitle.replace(/[([]\w+\s*\w*\s*video[)\]]/i, '').trim()
  songTitle = songTitle.replace(/[([]\w*\s*audio[)\]]/i, '').trim()
  songTitle = genius.f.cleanUpSongTitle(songTitle)

  let musicIsPlaying = document.querySelector('#play-pause-button #icon svg g path') && !document.querySelector('#play-pause-button #icon svg g path').getAttribute('d').startsWith('M8')
  if (!document.querySelector('.play-pause-button.spinner-container').hidden) {
    // Spinner is showing on playpause button -> song was just changed
    musicIsPlaying = true
  }
  genius.f.loadLyrics(force, beLessSpecific, songTitle, songArtistsArr, musicIsPlaying)
}

let lastPos = null
function updateAutoScroll () {
  let pos = null
  try {
    const [current, total] = document.querySelector('.ytmusic-player-bar .time-info.ytmusic-player-bar').textContent.split('/').map(s => s.trim()).map(s => s.split(':').reverse().map((d, i, a) => parseInt(d) * Math.pow(60, i)).reduce((a, c) => a + c, 0))
    pos = current / total
  } catch (e) {
    // Could not parse current song position
    pos = null
  }
  if (pos != null && !Number.isNaN(pos) && lastPos !== pos) {
    genius.f.scrollLyrics(pos)
    lastPos = pos
  }
}

function showSearchField (query) {
  const b = getCleanLyricsContainer()

  b.style.border = '1px solid black'
  b.style.borderRadius = '3px'
  b.style.padding = '5px'

  b.appendChild(document.createTextNode('Search genius.com: '))
  b.style.paddingRight = '15px'
  const input = b.appendChild(document.createElement('input'))
  input.className = 'geniussearchinput'
  input.placeholder = 'Search genius.com...'

  const span = b.appendChild(document.createElement('span'))
  span.style = 'cursor:pointer'
  span.appendChild(document.createTextNode(' \uD83D\uDD0D'))

  // Hide button
  const hideButton = b.appendChild(document.createElement('span'))
  hideButton.style = 'cursor:pointer;opacity: 0.8;padding-left: 10px;color: white;font-size: larger;vertical-align: top;'
  hideButton.title = 'Hide'
  hideButton.appendChild(document.createTextNode('\uD83C\uDD87'))
  hideButton.addEventListener('click', function hideButtonClick (ev) {
    ev.preventDefault()
    hideLyrics()
  })

  if (query) {
    input.value = query
  } else if (genius.current.artists) {
    input.value = genius.current.artists
  }
  input.addEventListener('change', function onSearchLyricsButtonClick () {
    if (input.value) {
      genius.f.searchByQuery(input.value, b)
    }
  })
  input.addEventListener('keyup', function onSearchLyricsKeyUp (ev) {
    if (ev.keyCode === 13) {
      ev.preventDefault()
      if (input.value) {
        genius.f.searchByQuery(input.value, b)
      }
    }
  })
  span.addEventListener('click', function onSearchLyricsKeyUp (ev) {
    if (input.value) {
      genius.f.searchByQuery(input.value, b)
    }
  })

  document.body.appendChild(b)
  input.focus()
}

function listSongs (hits, container, query) {
  if (!container) {
    container = getCleanLyricsContainer()
  }

  container.classList.add('geniusSearch')

  // Back to search button
  const backToSearchButton = document.createElement('a')
  backToSearchButton.href = '#'
  backToSearchButton.appendChild(document.createTextNode('Back to search'))
  backToSearchButton.addEventListener('click', function backToSearchButtonClick (ev) {
    ev.preventDefault()
    if (query) {
      showSearchField(query)
    } else if (genius.current.artists) {
      showSearchField(genius.current.artists + ' ' + genius.current.title)
    } else {
      showSearchField()
    }
  })

  const separator = document.createElement('span')
  separator.setAttribute('class', 'second-line-separator')
  separator.setAttribute('style', 'padding:0px 3px')
  separator.appendChild(document.createTextNode('•'))

  // Hide button
  const hideButton = document.createElement('a')
  hideButton.href = '#'
  hideButton.appendChild(document.createTextNode('Hide'))
  hideButton.addEventListener('click', function hideButtonClick (ev) {
    ev.preventDefault()
    hideLyrics()
  })

  // List search results
  const trackhtml = '<div style="float:left;"><div class="onhover" style="margin-top:-0.25em;display:none"><span style="color:#222;font-size:2.0em">🅖</span></div><div class="onout"><span style="font-size:1.5em">📄</span></div></div>' +
  '<div style="float:left; margin-left:5px">$artist • $title <br><span style="font-size:0.7em">👁 $stats.pageviews $lyrics_state</span></div><div style="clear:left;"></div>'
  container.innerHTML = '<ol class="tracklist" style="width:99%; font-size:1.15em"></ol>'

  container.style.border = '1px solid black'
  container.style.borderRadius = '3px'

  container.insertBefore(hideButton, container.firstChild)
  container.insertBefore(separator, container.firstChild)
  container.insertBefore(backToSearchButton, container.firstChild)

  const ol = container.querySelector('ol.tracklist')
  ol.style.listStyle = 'none'
  const searchresultsLengths = hits.length
  const title = genius.current.title
  const artists = genius.current.artists
  const onclick = function onclick () {
    genius.f.rememberLyricsSelection(title, artists, this.dataset.hit)
    genius.f.showLyrics(JSON.parse(this.dataset.hit), searchresultsLengths)
  }
  const mouseover = function onmouseover () {
    this.querySelector('.onhover').style.display = 'block'
    this.querySelector('.onout').style.display = 'none'
    this.style.backgroundColor = '#666'
  }
  const mouseout = function onmouseout () {
    this.querySelector('.onhover').style.display = 'none'
    this.querySelector('.onout').style.display = 'block'
    this.style.backgroundColor = '#333'
  }

  hits.forEach(function forEachHit (hit) {
    const li = document.createElement('li')
    li.style.cursor = 'pointer'
    li.style.transition = 'background-color 350ms'
    li.style.padding = '3px'
    li.style.margin = '2px'
    li.style.borderRadius = '3px'
    li.style.backgroundColor = '#333'
    li.innerHTML = trackhtml.replace(/\$title/g, hit.result.title_with_featured).replace(/\$artist/g, hit.result.primary_artist.name).replace(/\$lyrics_state/g, hit.result.lyrics_state).replace(/\$stats\.pageviews/g, genius.f.metricPrefix(hit.result.stats.pageviews, 1))
    li.dataset.hit = JSON.stringify(hit)

    li.addEventListener('click', onclick)
    li.addEventListener('mouseover', mouseover)
    li.addEventListener('mouseout', mouseout)
    ol.appendChild(li)
  })
}

function loremIpsum () {
  const classText = ['<span class="gray">', '</span>']
  const classWhitespace = ['<span class="white">', '</span>']
  const random = (x) => 1 + parseInt(Math.random() * x)
  let text = ''
  for (let v = 0; v < Math.max(3, random(5)); v++) {
    for (let b = 0; b < random(6); b++) {
      const line = []
      for (let l = 0; l < random(9); l++) {
        for (let w = 0; w < 1 + random(10); w++) {
          for (let i = 0; i < 1 + random(7); i++) {
            line.push('x')
          }
          line.push(classText[1] + classWhitespace[0] + '&#160;' + classWhitespace[1] + classText[0])
        }
        line.push(classText[1] + '\n<br>\n' + classText[0])
      }
      text += classText[0] + line.join('') + classText[1] + '\n<br>\n'
    }
  }
  return text
}

function createSpinner (spinnerHolder) {
  const lyricscontainer = document.getElementById('lyricscontainer')

  const rect = lyricscontainer.getBoundingClientRect()
  spinnerHolder.style.left = ''
  spinnerHolder.style.right = '0px'
  spinnerHolder.style.top = (lyricscontainer.style.top ? (parseInt(lyricscontainer.style.top) + 50) + 'px' : 0) || '120px'
  spinnerHolder.style.width = lyricscontainer.style.width || (rect.width - 1 + 'px')

  const spinner = spinnerHolder.appendChild(document.createElement('div'))
  spinner.classList.add('loadingspinner')
  spinner.style.marginLeft = (rect.width / 2) + 'px'

  const lorem = spinnerHolder.appendChild(document.createElement('div'))
  lorem.classList.add('lorem')
  lorem.innerHTML = loremIpsum()

  function resizeSpinner () {
    const spinnerHolder = document.querySelector('.loadingspinnerholder')
    const lyricscontainer = document.getElementById('lyricscontainer')
    if (spinnerHolder && lyricscontainer) {
      const rect = lyricscontainer.getBoundingClientRect()
      spinnerHolder.style.top = (lyricscontainer.style.top ? (parseInt(lyricscontainer.style.top) + 50) + 'px' : 0) || '120px'
      spinnerHolder.style.width = lyricscontainer.style.width || (rect.width - 1 + 'px')
      const loadingSpinner = spinnerHolder.querySelector('.loadingspinner')
      if (loadingSpinner) {
        loadingSpinner.style.marginLeft = (rect.width / 2) + 'px'
      }
    } else {
      window.clearInterval(resizeSpinnerIV)
    }
  }
  const resizeSpinnerIV = window.setInterval(resizeSpinner, 1000)

  return spinner
}

function configLyricsWidth (div) {
  // Input: lyrics width
  const label = div.appendChild(document.createElement('label'))
  label.setAttribute('for', 'input85654')
  label.appendChild(document.createTextNode('Lyrics width: '))

  const input = div.appendChild(document.createElement('input'))
  input.type = 'text'
  input.id = 'input85654'
  input.size = 4
  GM.getValue('lyricswidth', '40%').then(function (v) {
    input.value = v
  })

  const onChange = function onChangeListener () {
    const m = input.value.match(/\d+%/)
    if (m && m[0]) {
      lyricsWidth = m[0]
      GM.setValue('lyricswidth', lyricsWidth).then(function () {
        addLyrics(true)
      })
      input.value = lyricsWidth
    } else {
      window.alert('Please set a percentage e.g. 40%')
    }
  }
  input.addEventListener('change', onChange)
}

function main () {
  GM.getValue('lyricswidth', '40%').then(function (v) {
    lyricsWidth = v
    if (document.querySelector('.ytmusic-player-bar .title.ytmusic-player-bar')) {
      if (genius.option.autoShow) {
        addLyrics()
      } else {
        addLyricsButton()
      }
      if (genius.option.resizeOnNextRun) {
        genius.option.resizeOnNextRun = false
        resize()
      }
    }
  })
}

const genius = geniusLyrics({
  GM: GM,
  scriptName: SCRIPT_NAME,
  scriptIssuesURL: 'https://github.com/cvzi/Youtube-Music-Genius-Lyrics-userscript/issues',
  scriptIssuesTitle: 'Report problem: github.com/cvzi/Youtube-Music-Genius-Lyrics-userscript/issues',
  domain: 'https://music.youtube.com/',
  emptyURL: 'https://music.youtube.com/robots.txt',
  config: [configLyricsWidth],
  main: main,
  addCss: addCss,
  listSongs: listSongs,
  showSearchField: showSearchField,
  addLyrics: addLyrics,
  hideLyrics: hideLyrics,
  getCleanLyricsContainer: getCleanLyricsContainer,
  setFrameDimensions: setFrameDimensions,
  onResize: onResize,
  createSpinner: createSpinner
})

GM.registerMenuCommand(SCRIPT_NAME + ' - Show lyrics', () => addLyrics(true))

window.setInterval(updateAutoScroll, 7000)
