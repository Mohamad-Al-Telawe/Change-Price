export function statusMark(status) {
  return {
    'Under Review': 'mark-warning',
    Approved: 'mark-success',
    'Approved with Modification': 'mark-info',
    Rejected: 'mark-danger',
  }[status] || 'mark-neutral';
}

export function stageMark(stage) {
  return {
    Received: 'mark-neutral',
    Reviewed: 'mark-info',
    'Pending Execution': 'mark-warning',
    Completed: 'mark-success',
  }[stage] || 'mark-neutral';
}