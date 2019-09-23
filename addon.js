const {BrowserWindow, dialog} = require('electron').remote
const fs = require('fs')

class Uptime {

	constructor(tool, i18n) {
		this.tool = tool
		this.overlays = tool.overlays
		this.settings = tool.settings


		this.lastOutput = ''
		this.outputFilePath = ''
		this.fileWriteError = false
		this.timeoutObject = null

		const self = this

		this.overlays.appendSetting('', this.tool.i18n.__('Overlay URL'), 'text', {attrid: 'uptime_overlay_url', set: 'uptime', setLabel: i18n.__('Uptime Overlay'), readonly: true, default: 'http://localhost:' + this.overlays.overlayport + '/uptime/index.html', 'description': this.tool.i18n.__('Add #black to the end of the URL to get black text with white borders instead of white text with black borders.')})
		this.overlays.appendSetting('', this.tool.i18n.__('Black font'), 'checkbox', {set: 'uptime', readonly: true, default: false, onchange: (e) => {
			if(e.target.checked) {
				document.querySelector('#uptime_overlay_url').value = 'http://localhost:' + self.overlays.overlayport + '/uptime/index.html#black'
			} else {
				document.querySelector('#uptime_overlay_url').value = 'http://localhost:' + self.overlays.overlayport + '/uptime/index.html'
			}
		}})

		this.outputFilePath = this.settings.getString('uptime_file', '')
		this.settings.appendSetting('uptime_file', i18n.__('Write uptime to this file'), 'text', { attrid: 'uptime_file_setting', set: 'uptime_settings', setLabel: i18n.__('Uptime Settings'), description: i18n.__('Select a file that the uptime should be written to.'), default: '', readonly: true })
		this.settings.appendSetting('', i18n.__('Select file'), 'button', { set: 'uptime_settings', onclick: () => {
			let file = dialog.showSaveDialogSync(BrowserWindow.getFocusedWindow(), { })
			if(typeof(file) !== 'string') {
				file = ''
			}
			self.settings.setString('uptime_file', file)
			self.outputFilePath = file
			document.querySelector('#uptime_file_setting').value = file
			self.fileWriteError = false
		} })
		this.settings.appendSetting('', i18n.__('Disable file output'), 'button', { set: 'uptime_settings', onclick: () => {
			let file = ''
			self.settings.setString('uptime_file', file)
			self.outputFilePath = file
			document.querySelector('#uptime_file_setting').value = file
			self.fileWriteError = false
		} })

		this.timeoutObject = window.setTimeout(() => {
			self.updateUptime()
		}, 1000)

		this.tool.on('exit', () => {
			if(self.timeoutObject !== null) {
				clearTimeout(self.timeoutObject)
			}
		})
	}

	updateUptime() {
		const self = this

		let broadcast = ''
		if(this.tool.channel.streamobject.hasOwnProperty('started_at')) {
			broadcast = this.tool.channel.streamobject.started_at
		}
		if(broadcast.length > 0)
			this.overlays.broadcastWsMessage('uptime_update=' + broadcast)

		if(this.outputFilePath.length > 0) {
			let uptimeStr = ''
			if(broadcast.length > 0) {
				let now = new Date().getTime()
				let goal = new Date(broadcast).getTime()
				if(goal > 0 && goal < now) {
					var sec = Math.ceil((now-goal) / 1000)
					var min = Math.floor(sec / 60); sec = sec - (min * 60)
					var hou = Math.floor(min / 60); min = min - (hou * 60)

					uptimeStr = (hou > 0 ? hou + ':' : '' ) + ((min < 10 && hou > 0) ? '0' + min : min) + ':' + (sec < 10 ? '0' + sec : sec)
				}
			}

			if(this.lastOutput != uptimeStr) {
				this.lastOutput = uptimeStr
				fs.writeFile(this.outputFilePath, uptimeStr, (e) => {
					if(e) {
						self.fileWriteError = true
						self.tool.ui.showErrorMessage(e)
					}
				})
			}
		}
		
		this.timeoutObject = window.setTimeout(() => {
			self.updateUptime()
		}, 1000)
	}

}

module.exports = Uptime