'use client';

import { useState } from 'react';
import { MessageSquare, Reply, ChevronDown, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

// Role color config
const roleStyles = {
  Employee: { bg: 'rgba(16,185,129,0.06)', border: 'rgba(16,185,129,0.15)', color: '#34d399', dot: 'linear-gradient(135deg, #10b981, #059669)' },
  Manager: { bg: 'rgba(99,102,241,0.04)', border: 'rgba(99,102,241,0.12)', color: '#818cf8', dot: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
  Admin: { bg: 'rgba(239,68,68,0.04)', border: 'rgba(239,68,68,0.12)', color: '#f87171', dot: 'linear-gradient(135deg, #ef4444, #dc2626)' },
};

// Single comment component (recursive)
function CommentNode({ comment, depth = 0, onReply, currentUser }) {
  const [expanded, setExpanded] = useState(true);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rc = roleStyles[comment.role] || roleStyles.Manager;
  const hasReplies = comment.replies && comment.replies.length > 0;

  const handleSubmitReply = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    await onReply(comment._id, replyText.trim());
    setReplyText('');
    setShowReplyBox(false);
    setSubmitting(false);
  };

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div id={`comment-${comment._id}`} style={{ marginLeft: depth > 0 ? '20px' : 0, borderLeft: depth > 0 ? `2px solid ${rc.border}` : 'none', paddingLeft: depth > 0 ? '16px' : 0 }}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          padding: '12px 14px',
          borderRadius: '10px',
          background: rc.bg,
          border: `1px solid ${rc.border}`,
          marginBottom: '8px',
          transition: 'background 0.15s',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', background: rc.dot,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '10px', fontWeight: 700, flexShrink: 0,
          }}>
            {(comment.byName || 'U')[0]}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: rc.color }}>{comment.byName || 'User'}</span>
          <span style={{
            fontSize: '8px', background: `${rc.color}15`, color: rc.color,
            padding: '1px 6px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase',
          }}>{comment.role}</span>
          {comment.replyingTo && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              → replying to <span style={{ fontWeight: 600, color: '#818cf8' }}>{comment.replyingTo}</span>
            </span>
          )}
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {timeAgo(comment.createdAt)}
          </span>
        </div>

        {/* Content */}
        <p style={{
          fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6,
          margin: '0 0 8px 34px',
        }}>
          {comment.text}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '34px' }}>
          <button
            onClick={() => setShowReplyBox(!showReplyBox)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '3px 10px', borderRadius: '6px', border: 'none',
              background: showReplyBox ? 'rgba(99,102,241,0.12)' : 'transparent',
              color: showReplyBox ? '#818cf8' : 'var(--text-muted)',
              fontSize: '11px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!showReplyBox) e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
            onMouseLeave={e => { if (!showReplyBox) e.currentTarget.style.background = 'transparent'; }}
          >
            <Reply size={11} /> Reply
          </button>

          {hasReplies && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                display: 'flex', alignItems: 'center', gap: '3px',
                padding: '3px 8px', borderRadius: '6px', border: 'none',
                background: 'transparent', color: 'var(--text-muted)',
                fontSize: '10px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              {expanded ? 'Collapse' : `${comment.replies.length} ${comment.replies.length === 1 ? 'reply' : 'replies'}`}
            </button>
          )}
        </div>

        {/* Reply Box */}
        {showReplyBox && (
          <div style={{ marginTop: '10px', marginLeft: '34px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              background: roleStyles[currentUser?.role]?.dot || 'var(--gradient-1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '9px', fontWeight: 700, flexShrink: 0, marginTop: '4px',
            }}>
              {(currentUser?.name || 'U')[0]}
            </div>
            <div style={{ flex: 1 }}>
              <textarea
                className="input-dark"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder={`Reply to ${comment.byName}...`}
                rows={2}
                style={{ width: '100%', resize: 'none', minHeight: '60px', fontSize: '12px', marginBottom: '6px' }}
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyText.trim() || submitting}
                  className="btn-glow"
                  style={{ padding: '4px 12px', fontSize: '11px', opacity: replyText.trim() ? 1 : 0.4 }}
                >
                  {submitting ? '...' : 'Reply'}
                </button>
                <button
                  onClick={() => { setShowReplyBox(false); setReplyText(''); }}
                  style={{
                    padding: '4px 12px', fontSize: '11px', borderRadius: '6px',
                    border: '1px solid var(--border-color)', background: 'transparent',
                    color: 'var(--text-secondary)', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Nested replies */}
      {expanded && hasReplies && (
        <div>
          {comment.replies.map(reply => (
            <CommentNode key={reply._id} comment={reply} depth={depth + 1} onReply={onReply} currentUser={currentUser} />
          ))}
        </div>
      )}
    </div>
  );
}

// Build tree from flat list
function buildTree(comments) {
  const map = {};
  const roots = [];
  comments.forEach(c => { map[c._id] = { ...c, replies: [] }; });
  comments.forEach(c => {
    if (c.parentId && map[c.parentId]) {
      map[c.parentId].replies.push(map[c._id]);
    } else {
      roots.push(map[c._id]);
    }
  });
  return roots;
}

// Main exported component
export default function DiscussionThread({ comments, goalId, currentUser, onCommentPosted }) {
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);

  const tree = buildTree(comments);

  const postComment = async (parentId, text) => {
    try {
      const res = await fetch(`/api/goals/${goalId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, parentId: parentId || null }),
      });
      const data = await res.json();
      if (res.ok) {
        if (onCommentPosted) await onCommentPosted();
        return true;
      } else {
        alert(data.error || 'Unable to reply. Please retry later.');
        return false;
      }
    } catch {
      alert('Unable to reply. Please retry later.');
      return false;
    }
  };

  const handleNewComment = async () => {
    if (!newComment.trim() || posting) return;
    setPosting(true);
    const ok = await postComment(null, newComment.trim());
    if (ok) setNewComment('');
    setPosting(false);
  };

  const rc = roleStyles[currentUser?.role] || roleStyles.Employee;

  return (
    <div>
      {/* New comment box */}
      <div className="glass-card" style={{ padding: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: rc.dot,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginTop: '4px',
          }}>
            {(currentUser?.name || 'U')[0]}
          </div>
          <div style={{ flex: 1 }}>
            <textarea
              className="input-dark"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Start a discussion..."
              rows={2}
              style={{ width: '100%', resize: 'none', minHeight: '56px', fontSize: '12px', marginBottom: '8px' }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={handleNewComment}
                disabled={!newComment.trim() || posting}
                className="btn-glow"
                style={{ padding: '6px 14px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', opacity: newComment.trim() ? 1 : 0.4 }}
              >
                <MessageSquare size={12} /> {posting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thread */}
      {tree.length > 0 ? (
        <div>
          {tree.map(comment => (
            <CommentNode key={comment._id} comment={comment} depth={0} onReply={postComment} currentUser={currentUser} />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '28px 0' }}>
          <MessageSquare size={28} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 8px' }} />
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No discussion yet. Start the conversation above.</p>
        </div>
      )}
    </div>
  );
}
