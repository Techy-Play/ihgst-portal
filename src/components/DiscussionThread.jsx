'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Reply, ChevronDown, ChevronRight, ArrowUpDown, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ── Role colour config ── */
const roleStyles = {
  Employee: { bg: 'rgba(16,185,129,0.06)',  border: 'rgba(16,185,129,0.15)', color: '#34d399', dot: 'linear-gradient(135deg,#10b981,#059669)' },
  Manager:  { bg: 'rgba(99,102,241,0.04)',  border: 'rgba(99,102,241,0.12)', color: '#818cf8', dot: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  Admin:    { bg: 'rgba(239,68,68,0.04)',   border: 'rgba(239,68,68,0.12)',  color: '#f87171', dot: 'linear-gradient(135deg,#ef4444,#dc2626)' },
};

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];
const quarterColors = { Q1: '#34d399', Q2: '#60a5fa', Q3: '#fbbf24', Q4: '#f87171' };

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fullDate(date) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

/* ── Single comment node (recursive) ── */
function CommentNode({ comment, depth = 0, onReply, currentUser, replySortAsc }) {
  const [expanded, setExpanded] = useState(true);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const rc = roleStyles[comment.role] || roleStyles.Manager;
  const sortedReplies = comment.replies
    ? [...comment.replies].sort((a, b) =>
        replySortAsc
          ? new Date(a.createdAt) - new Date(b.createdAt)
          : new Date(b.createdAt) - new Date(a.createdAt)
      )
    : [];
  const hasReplies = sortedReplies.length > 0;

  const handleSubmitReply = async () => {
    if (!replyText.trim() || submitting) return;
    setSubmitting(true);
    await onReply(comment._id, replyText.trim(), comment.quarter);
    setReplyText('');
    setShowReplyBox(false);
    setSubmitting(false);
  };

  return (
    <div
      id={`comment-${comment._id}`}
      style={{
        marginLeft: depth > 0 ? '20px' : 0,
        borderLeft: depth > 0 ? `2px solid ${rc.border}` : 'none',
        paddingLeft: depth > 0 ? '16px' : 0,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        style={{ padding: '12px 14px', borderRadius: '10px', background: rc.bg, border: `1px solid ${rc.border}`, marginBottom: '8px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: rc.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
            {(comment.byName || 'U')[0]}
          </div>
          <span style={{ fontSize: '12px', fontWeight: 700, color: rc.color }}>{comment.byName || 'User'}</span>
          <span style={{ fontSize: '8px', background: `${rc.color}15`, color: rc.color, padding: '1px 6px', borderRadius: '4px', fontWeight: 600, textTransform: 'uppercase' }}>{comment.role}</span>
          {comment.quarter && (
            <span style={{ fontSize: '9px', background: `${quarterColors[comment.quarter] || '#818cf8'}18`, color: quarterColors[comment.quarter] || '#818cf8', padding: '1px 7px', borderRadius: '4px', fontWeight: 700, border: `1px solid ${quarterColors[comment.quarter] || '#818cf8'}30` }}>
              {comment.quarter}
            </span>
          )}
          {comment.replyingTo && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              → replying to <span style={{ fontWeight: 600, color: '#818cf8' }}>{comment.replyingTo}</span>
            </span>
          )}
          <span title={fullDate(comment.createdAt)} style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto', cursor: 'default' }}>
            {timeAgo(comment.createdAt)}
          </span>
        </div>

        {/* Text */}
        <p style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 8px 34px' }}>
          {comment.text}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '34px' }}>
          <button
            onClick={() => setShowReplyBox(!showReplyBox)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '6px', border: 'none', background: showReplyBox ? 'rgba(99,102,241,0.12)' : 'transparent', color: showReplyBox ? '#818cf8' : 'var(--text-muted)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
          >
            <Reply size={11} /> Reply
          </button>
          {hasReplies && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '3px 8px', borderRadius: '6px', border: 'none', background: 'transparent', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}
            >
              {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
              {expanded ? 'Collapse' : `${sortedReplies.length} ${sortedReplies.length === 1 ? 'reply' : 'replies'}`}
            </button>
          )}
        </div>

        {/* Reply box */}
        {showReplyBox && (
          <div style={{ marginTop: '10px', marginLeft: '34px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: roleStyles[currentUser?.role]?.dot || 'var(--gradient-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '9px', fontWeight: 700, flexShrink: 0, marginTop: '4px' }}>
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
                <button onClick={handleSubmitReply} disabled={!replyText.trim() || submitting} className="btn-glow" style={{ padding: '4px 12px', fontSize: '11px', opacity: replyText.trim() ? 1 : 0.4 }}>
                  {submitting ? '...' : 'Reply'}
                </button>
                <button onClick={() => { setShowReplyBox(false); setReplyText(''); }} style={{ padding: '4px 12px', fontSize: '11px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Nested replies */}
      <AnimatePresence>
        {expanded && hasReplies && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            {sortedReplies.map(reply => (
              <CommentNode key={reply._id} comment={reply} depth={depth + 1} onReply={onReply} currentUser={currentUser} replySortAsc={replySortAsc} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Build tree from flat list ── */
function buildTree(comments) {
  const map = {};
  const roots = [];
  comments.forEach(c => { map[c._id] = { ...c, replies: [] }; });
  comments.forEach(c => {
    if (c.parentId && map[c.parentId]) map[c.parentId].replies.push(map[c._id]);
    else roots.push(map[c._id]);
  });
  return roots;
}

/* ── Quarter group label ── */
function QuarterLabel({ quarter }) {
  const color = quarterColors[quarter] || '#818cf8';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '18px 0 10px' }}>
      <div style={{ height: '1px', flex: 1, background: `${color}30` }} />
      <span style={{ fontSize: '11px', fontWeight: 700, color, padding: '2px 10px', borderRadius: '99px', background: `${color}12`, border: `1px solid ${color}30` }}>
        {quarter} Notes
      </span>
      <div style={{ height: '1px', flex: 1, background: `${color}30` }} />
    </div>
  );
}

/**
 * Props:
 *   comments        – flat array (pass [] to use selfFetch mode)
 *   goalId          – string
 *   currentUser     – { name, role }
 *   onCommentPosted – callback after new comment
 *   quarter         – if set: filter/tag to this quarter (checkin mode, self-fetch)
 *   groupByQuarter  – if true: goal-detail mode with group headers + filter tabs
 *   selfFetch       – if true: component fetches its own comments
 */
export default function DiscussionThread({
  comments: commentsProp = [],
  goalId,
  currentUser,
  onCommentPosted,
  quarter = null,
  groupByQuarter = false,
  selfFetch = false,
}) {
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [replySortAsc, setReplySortAsc] = useState(true);
  const [fetchedComments, setFetchedComments] = useState(null);
  const [loadingComments, setLoadingComments] = useState(false);
  // For goal detail: tag to post with
  const [postQuarter, setPostQuarter] = useState(null);
  // For goal detail: active filter tab
  const [filterQ, setFilterQ] = useState('All');

  const shouldSelfFetch = selfFetch || commentsProp.length === 0;

  /* Fetch (re-fetch on quarter change or when shouldSelfFetch) */
  const fetchComments = (q) => {
    if (!goalId) return;
    setLoadingComments(true);
    // In goal-detail mode: fetch ALL, filter client-side by tab
    // In checkin mode: fetch only for that quarter (q is the prop quarter)
    const url = (q && !groupByQuarter)
      ? `/api/goals/${goalId}/comment?quarter=${q}`
      : `/api/goals/${goalId}/comment`;
    fetch(url)
      .then(r => r.json())
      .then(d => setFetchedComments(d.comments || []))
      .catch(() => setFetchedComments([]))
      .finally(() => setLoadingComments(false));
  };

  useEffect(() => {
    if (!shouldSelfFetch || !goalId) return;
    fetchComments(quarter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goalId, quarter, shouldSelfFetch]);

  const comments = shouldSelfFetch ? (fetchedComments || []) : commentsProp;

  /* Post a comment */
  const postComment = async (parentId, text, inheritedQuarter) => {
    try {
      const tagQ = parentId
        ? (inheritedQuarter || quarter || null)  // replies inherit parent's quarter
        : (quarter || postQuarter || null);       // top-level: prop quarter or user-selected
      const res = await fetch(`/api/goals/${goalId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, parentId: parentId || null, quarter: tagQ }),
      });
      const data = await res.json();
      if (res.ok) {
        if (onCommentPosted) await onCommentPosted();
        if (shouldSelfFetch && goalId) fetchComments(quarter);
        return true;
      } else {
        alert(data.error || 'Unable to post comment. Please retry later.');
        return false;
      }
    } catch {
      alert('Unable to post comment. Please retry later.');
      return false;
    }
  };

  const handleNewComment = async () => {
    if (!newComment.trim() || posting) return;
    setPosting(true);
    const ok = await postComment(null, newComment.trim(), null);
    if (ok) { setNewComment(''); setPostQuarter(null); }
    setPosting(false);
  };

  const rc = roleStyles[currentUser?.role] || roleStyles.Employee;

  /* Filter comments for goal-detail tab */
  const visibleComments = (groupByQuarter && filterQ !== 'All')
    ? comments.filter(c => c.quarter === filterQ)
    : comments;

  const allRoots = buildTree(visibleComments);
  const sortedRoots = [...allRoots].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  /* Render grouped (goal-detail mode, All tab) */
  const renderGrouped = () => {
    const groups = {};
    const noQuarter = [];
    sortedRoots.forEach(root => {
      if (root.quarter && QUARTERS.includes(root.quarter)) {
        if (!groups[root.quarter]) groups[root.quarter] = [];
        groups[root.quarter].push(root);
      } else {
        noQuarter.push(root);
      }
    });

    return (
      <>
        {QUARTERS.filter(q => groups[q]?.length).map(q => (
          <div key={q}>
            <QuarterLabel quarter={q} />
            {groups[q].map(c => (
              <CommentNode key={c._id} comment={c} depth={0} onReply={postComment} currentUser={currentUser} replySortAsc={replySortAsc} />
            ))}
          </div>
        ))}
        {noQuarter.length > 0 && (
          <div>
            {QUARTERS.some(q => groups[q]?.length) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '18px 0 10px' }}>
                <div style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>General</span>
                <div style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />
              </div>
            )}
            {noQuarter.map(c => (
              <CommentNode key={c._id} comment={c} depth={0} onReply={postComment} currentUser={currentUser} replySortAsc={replySortAsc} />
            ))}
          </div>
        )}
      </>
    );
  };

  const renderFlat = () =>
    sortedRoots.map(c => (
      <CommentNode key={c._id} comment={c} depth={0} onReply={postComment} currentUser={currentUser} replySortAsc={replySortAsc} />
    ));

  /* ═══════════ RENDER ═══════════ */
  return (
    <div>
      {/* ── Quarter badge (checkin mode) ── */}
      {quarter && !groupByQuarter && (
        <div style={{ marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: quarterColors[quarter] || '#818cf8', background: `${quarterColors[quarter] || '#818cf8'}12`, padding: '3px 10px', borderRadius: '99px', border: `1px solid ${quarterColors[quarter] || '#818cf8'}30` }}>
            📌 {quarter} Notes
          </span>
        </div>
      )}

      {/* ── Filter tabs (goal-detail mode) ── */}
      {groupByQuarter && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '14px', flexWrap: 'wrap' }}>
          {['All', ...QUARTERS].map(q => {
            const isActive = filterQ === q;
            const col = q === 'All' ? '#818cf8' : (quarterColors[q] || '#818cf8');
            return (
              <button
                key={q}
                onClick={() => setFilterQ(q)}
                style={{
                  padding: '4px 12px', borderRadius: '99px', border: `1px solid ${isActive ? col : 'var(--border-color)'}`,
                  background: isActive ? `${col}15` : 'transparent', color: isActive ? col : 'var(--text-muted)',
                  fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {q === 'All' ? 'All' : `${q}`}
              </button>
            );
          })}
        </div>
      )}

      {/* ── New comment box ── */}
      <div className="glass-card" style={{ padding: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: rc.dot, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 700, flexShrink: 0, marginTop: '4px' }}>
            {(currentUser?.name || 'U')[0]}
          </div>
          <div style={{ flex: 1 }}>
            <textarea
              className="input-dark"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder={quarter ? `Add a ${quarter} note... (Enter to post)` : 'Start a discussion...'}
              rows={2}
              style={{ width: '100%', resize: 'none', minHeight: '56px', fontSize: '12px', marginBottom: '8px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleNewComment(); } }}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              {/* Quarter tag selector — only in goal detail mode */}
              {groupByQuarter && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                  <Tag size={11} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginRight: '2px' }}>Tag:</span>
                  {QUARTERS.map(q => {
                    const col = quarterColors[q];
                    const active = postQuarter === q;
                    return (
                      <button
                        key={q}
                        onClick={() => setPostQuarter(active ? null : q)}
                        style={{ padding: '2px 8px', borderRadius: '99px', border: `1px solid ${active ? col : 'var(--border-color)'}`, background: active ? `${col}18` : 'transparent', color: active ? col : 'var(--text-muted)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.12s' }}
                      >
                        {q}
                      </button>
                    );
                  })}
                  {postQuarter && (
                    <button onClick={() => setPostQuarter(null)} style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Clear</button>
                  )}
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    {postQuarter ? `Will tag as ${postQuarter}` : '(No tag = general only)'}
                  </span>
                </div>
              )}
              <button
                onClick={handleNewComment}
                disabled={!newComment.trim() || posting}
                className="btn-glow"
                style={{ padding: '6px 14px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', opacity: newComment.trim() ? 1 : 0.4, marginLeft: 'auto' }}
              >
                <MessageSquare size={12} /> {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Reply sort toggle ── */}
      {allRoots.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
          <button
            onClick={() => setReplySortAsc(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            <ArrowUpDown size={11} /> Replies: {replySortAsc ? 'Old → New' : 'New → Old'}
          </button>
        </div>
      )}

      {/* ── Thread ── */}
      {loadingComments ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ width: 24, height: 24, border: '2px solid var(--border-color)', borderTopColor: '#818cf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 8px' }} />
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Loading notes...</p>
        </div>
      ) : allRoots.length > 0 ? (
        <div>
          {(groupByQuarter && filterQ === 'All') ? renderGrouped() : renderFlat()}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '28px 0' }}>
          <MessageSquare size={28} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 8px' }} />
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {quarter
              ? `No ${quarter} notes yet. Be the first to add one!`
              : filterQ !== 'All'
              ? `No ${filterQ} discussions yet.`
              : 'No discussion yet. Start the conversation above.'}
          </p>
        </div>
      )}
    </div>
  );
}
