import * as React from 'react'
import * as Path from 'path'

import { Repository } from '../../models/repository'
import { Dispatcher } from '../dispatcher'
import { Dialog, DialogContent, DialogFooter } from '../dialog'
import { Ref } from '../lib/ref'
import { OkCancelButtonGroup } from '../dialog/ok-cancel-button-group'
import { removeWorktree, listWorktrees } from '../../lib/git/worktree'

interface IDeleteWorktreeDialogProps {
  readonly repository: Repository
  readonly worktreePath: string
  readonly dispatcher: Dispatcher
  readonly onDismissed: () => void
}

interface IDeleteWorktreeDialogState {
  readonly isDeleting: boolean
}

export class DeleteWorktreeDialog extends React.Component<
  IDeleteWorktreeDialogProps,
  IDeleteWorktreeDialogState
> {
  public constructor(props: IDeleteWorktreeDialogProps) {
    super(props)

    this.state = {
      isDeleting: false,
    }
  }

  public render() {
    const name = Path.basename(this.props.worktreePath)

    return (
      <Dialog
        id="delete-worktree"
        title={__DARWIN__ ? 'Delete Worktree' : 'Delete worktree'}
        type="warning"
        onSubmit={this.onDeleteWorktree}
        onDismissed={this.props.onDismissed}
        disabled={this.state.isDeleting}
        loading={this.state.isDeleting}
        role="alertdialog"
        ariaDescribedBy="delete-worktree-confirmation"
      >
        <DialogContent>
          <p id="delete-worktree-confirmation">
            Are you sure you want to delete the worktree <Ref>{name}</Ref>?
          </p>
        </DialogContent>
        <DialogFooter>
          <OkCancelButtonGroup destructive={true} okButtonText="Delete" />
        </DialogFooter>
      </Dialog>
    )
  }

  private onDeleteWorktree = async () => {
    this.setState({ isDeleting: true })

    const { repository, worktreePath, dispatcher } = this.props
    const isDeletingCurrentWorktree =
      repository.path === worktreePath

    try {
      if (isDeletingCurrentWorktree) {
        // When deleting the currently selected worktree, we must switch away
        // first. Otherwise git runs from the directory being deleted and the
        // app is left pointing at a non-existent path.
        const worktrees = await listWorktrees(repository)
        const mainPath = worktrees.find(wt => wt.type === 'main')?.path
        if (mainPath === undefined) {
          throw new Error('Could not find main worktree')
        }

        // Switch the existing repository record to the main worktree path,
        // preserving the id, alias, and other settings.
        await dispatcher.switchWorktree(repository, mainPath)
        // removeWorktree needs to run from a path other than the one being
        // deleted. The repository object is immutable and still holds the old
        // path so we construct a copy pointing at the main worktree.
        const mainRepo = new Repository(
          mainPath,
          repository.id,
          repository.gitHubRepository,
          repository.missing,
          repository.alias,
          repository.workflowPreferences,
          repository.isTutorialRepository,
          repository.mainWorktreePath
        )
        await removeWorktree(mainRepo, worktreePath)
      } else {
        await removeWorktree(repository, worktreePath)
      }
    } catch (e) {
      dispatcher.postError(e)
      this.setState({ isDeleting: false })
      return
    }

    this.props.onDismissed()
  }
}
