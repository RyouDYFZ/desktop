import * as React from 'react'
import { DialogContent } from '../dialog'
import { Select } from '../lib/select'
import { ICopilotModel } from '../../lib/app-state'
import { DefaultCopilotModel } from '../../lib/stores/copilot-store'

interface ICopilotPreferencesProps {
  readonly selectedCopilotModel: string | null
  readonly copilotModels: ReadonlyArray<ICopilotModel>
  readonly copilotAvailable: boolean
  readonly onSelectedCopilotModelChanged: (model: string | null) => void
}

export class CopilotPreferences extends React.Component<ICopilotPreferencesProps> {
  private onModelChanged = (event: React.FormEvent<HTMLSelectElement>) => {
    const value = event.currentTarget.value
    this.props.onSelectedCopilotModelChanged(
      value === DefaultCopilotModel ? null : value
    )
  }

  public render() {
    return (
      <DialogContent>
        <div className="copilot-section">
          <h2 id="copilot-model-heading">
            {__DARWIN__ ? 'Commit Message Model' : 'Commit message model'}
          </h2>
          {this.renderModelPicker()}
        </div>
      </DialogContent>
    )
  }

  private renderModelPicker() {
    if (!this.props.copilotAvailable) {
      return (
        <p>
          Sign in to a GitHub.com account in the Accounts tab to configure
          Copilot settings.
        </p>
      )
    }

    const { copilotModels, selectedCopilotModel } = this.props

    if (copilotModels.length === 0) {
      return <p>Loading available models…</p>
    }

    return (
      <Select
        label={
          __DARWIN__
            ? 'Model Used for Commit Messages'
            : 'Model used for commit messages'
        }
        value={selectedCopilotModel ?? DefaultCopilotModel}
        onChange={this.onModelChanged}
      >
        {copilotModels.map(m => (
          <option key={m.id} value={m.id}>
            {m.id === DefaultCopilotModel ? `${m.name} (default)` : m.name}
          </option>
        ))}
      </Select>
    )
  }
}
