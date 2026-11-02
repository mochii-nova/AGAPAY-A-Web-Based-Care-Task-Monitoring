import { ClipboardList, StickyNote } from 'lucide-react';
import Modal from '../Modal';
import StatusPill from '../StatusPill';
import TaskCategoryIcon from '../TaskCategoryIcon';
import { getCategory, shiftTime } from '../../constants';
import { formatTime, formatLongDate } from '../../utils/format';
import { shiftOfDue } from '../../utils/adminTasks';

// Pop-up for "View": everything about one task, with Edit and Delete.
// Instructions (written by an admin) and the caregiver's note are shown as two separate parts.
export default function TaskViewModal({ task, onEdit, onDelete, onClose }) {
  const shift = task && shiftOfDue(task.dueAt).shift;
  const notSet = <span className="profile-unset">Not set</span>;

  return (
    <Modal
      open={!!task}
      onClose={onClose}
      title={task?.task ?? ''}
      footer={
        task && (
          <>
            <button type="button" className="btn btn--danger" onClick={onDelete}>Delete</button>
            <button type="button" className="btn btn--primary" onClick={onEdit}>Edit task</button>
          </>
        )
      }
    >
      {task && (
        <>
          <div className="task-detail">
            <TaskCategoryIcon category={task.category} size={20} />
            <div className="task-detail__main">
              <p className="small-label">{getCategory(task.category)?.label ?? 'Care task'}</p>
              <p className="task-detail__resident">
                {task.resident ?? 'No resident'}
                {task.room && <span> · Room {task.room}</span>}
              </p>
              <p className="task-detail__time">Due {formatTime(task.dueAt)}, {formatLongDate(task.dueAt)}</p>
            </div>
            <StatusPill status={task.status} />
          </div>

          <dl className="info-list task-view__list">
            <div><dt>Shift</dt><dd>{shift.label} · {shiftTime(shift)}</dd></div>
            <div><dt>Caregiver</dt><dd>{task.assignedToName ?? <span className="resident-details__gap">Not assigned yet</span>}</dd></div>
            {task.status === 'completed' && (
              <div>
                <dt>Completed</dt>
                <dd>{formatTime(task.doneAt)}{task.completedBy && ` by ${task.completedBy.name}`}</dd>
              </div>
            )}
            {task.status === 'skipped' && (
              <div>
                <dt>Skipped</dt>
                <dd>{task.skipReason}{task.completedBy && ` (${task.completedBy.name})`}</dd>
              </div>
            )}
          </dl>

          <div className="task-texts">
            <section className="task-text task-text--instructions">
              <h3 className="task-text__title"><ClipboardList size={16} aria-hidden="true" /> Instructions <small>from the admin</small></h3>
              <p>{task.instructions || notSet}</p>
            </section>
            <section className="task-text">
              <h3 className="task-text__title"><StickyNote size={16} aria-hidden="true" /> Caregiver note <small>from the caregiver</small></h3>
              <p>{task.note || <span className="profile-unset">No note yet</span>}</p>
            </section>
          </div>
        </>
      )}
    </Modal>
  );
}
