import db from '../db/db.js';

export default function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    // Participant joins session room
    socket.on('join:session', ({ sessionId, participantId }) => {
      if (!sessionId || !participantId) return;

      // Validate participant belongs to session
      const participant = db.prepare('SELECT * FROM participant WHERE id = ? AND session_id = ?').get(participantId, sessionId);
      if (!participant) return;

      socket.join(`session:${sessionId}`);
      socket.data = { sessionId, participantId, role: 'participant' };
    });

    // Host joins session room
    socket.on('host:session', ({ sessionId, adminToken }) => {
      if (!sessionId || !adminToken) return;

      // Validate admin token matches the session's quiz
      const session = db.prepare(`
        SELECT s.*, q.admin_token FROM session s
        JOIN quiz q ON q.id = s.quiz_id
        WHERE s.id = ?
      `).get(sessionId);

      if (!session || session.admin_token !== adminToken) return;

      socket.join(`session:${sessionId}`);
      socket.data = { sessionId, adminToken, role: 'host' };
      
      // Send current state to host for proper restoration
      const questions = db.prepare('SELECT * FROM question WHERE quiz_id = ? ORDER BY sort_order').all(session.quiz_id);
      const scores = db.prepare(`
        SELECT display_name, team_name, score FROM participant
        WHERE session_id = ? ORDER BY score DESC
      `).all(sessionId).map(p => ({ name: p.display_name, team: p.team_name, score: p.score }));
      
      if (session.status === 'active' && session.current_phase) {
        const currentQuestion = questions[session.current_question_index];
        
        // If in result phases or waiting_for_continue, send state with additional context
        if (['correct_answer', 'round_result', 'scoreboard', 'waiting_for_continue'].includes(session.current_phase) && currentQuestion) {
          const stateData = {
            status: 'active',
            currentPhase: session.current_phase,
            questionIndex: session.current_question_index,
            totalQuestions: questions.length,
            scores
          };
          
          // Include round winner if in round_result, scoreboard, or waiting_for_continue phase
          if (['round_result', 'scoreboard', 'waiting_for_continue'].includes(session.current_phase)) {
            const roundWinner = db.prepare(`
              SELECT p.display_name AS name, p.team_name AS team, r.response_time_ms, r.points_awarded
              FROM response r
              JOIN participant p ON p.id = r.participant_id
              WHERE r.question_id = ? AND p.session_id = ? AND r.is_correct = 1 AND r.response_time_ms IS NOT NULL AND r.response_time_ms > 0
              ORDER BY r.response_time_ms ASC
              LIMIT 1
            `).get(currentQuestion.id, sessionId);
            
            if (roundWinner) {
              socket.emit('session:round_result', {
                winner: {
                  name: roundWinner.name,
                  team: roundWinner.team,
                  timeMs: roundWinner.response_time_ms,
                  points: roundWinner.points_awarded
                }
              });
            }
          }
          
          // Include correct answer and stats for all result phases
          if (['correct_answer', 'scoreboard', 'waiting_for_continue'].includes(session.current_phase)) {
            const correctAnswers = db.prepare('SELECT * FROM answer WHERE question_id = ? AND is_correct = 1').all(currentQuestion.id);
            const correctResponses = db.prepare(`
              SELECT COUNT(*) as count FROM response r
              JOIN participant p ON p.id = r.participant_id
              WHERE r.question_id = ? AND p.session_id = ? AND r.is_correct = 1
            `).get(currentQuestion.id, sessionId);
            const totalResponses = db.prepare(`
              SELECT COUNT(*) as count FROM response r
              JOIN participant p ON p.id = r.participant_id
              WHERE r.question_id = ? AND p.session_id = ?
            `).get(currentQuestion.id, sessionId);
            
            socket.emit('session:correct_answer', {
              question: {
                id: currentQuestion.id,
                text: currentQuestion.text,
                type: currentQuestion.type,
                correctValue: currentQuestion.correct_value
              },
              correctAnswers: correctAnswers.map(a => ({
                id: a.id,
                text: a.text,
                partLabel: a.part_label
              })),
              correctCount: correctResponses?.count || 0,
              totalCount: totalResponses?.count || 0
            });
          }
          
          // If waiting_for_continue, also emit that event
          if (session.current_phase === 'waiting_for_continue') {
            const correctAnswers = db.prepare('SELECT * FROM answer WHERE question_id = ? AND is_correct = 1').all(currentQuestion.id);
            const correctResponses = db.prepare(`
              SELECT COUNT(*) as count FROM response r
              JOIN participant p ON p.id = r.participant_id
              WHERE r.question_id = ? AND p.session_id = ? AND r.is_correct = 1
            `).get(currentQuestion.id, sessionId);
            const totalResponses = db.prepare(`
              SELECT COUNT(*) as count FROM response r
              JOIN participant p ON p.id = r.participant_id
              WHERE r.question_id = ? AND p.session_id = ?
            `).get(currentQuestion.id, sessionId);
            
            socket.emit('session:waiting_for_continue', {
              nextIndex: session.current_question_index + 1,
              questionStats: {
                question: {
                  text: currentQuestion.text,
                  type: currentQuestion.type,
                  correctValue: currentQuestion.correct_value
                },
                correctAnswers: correctAnswers.map(a => ({
                  text: a.text,
                  partLabel: a.part_label
                })),
                correctCount: correctResponses?.count || 0,
                totalCount: totalResponses?.count || 0
              }
            });
          }
          
          socket.emit('session:state', stateData);
        }
      }
    });

    // Rejoin on reconnect — full state sync
    socket.on('rejoin:session', ({ sessionId, participantId }) => {
      if (!sessionId) return;

      // Validate
      if (participantId) {
        const participant = db.prepare('SELECT * FROM participant WHERE id = ? AND session_id = ?').get(participantId, sessionId);
        if (!participant) return;
      }

      socket.join(`session:${sessionId}`);

      // Build full state
      const session = db.prepare('SELECT * FROM session WHERE id = ?').get(sessionId);
      if (!session) return;

      const questions = db.prepare('SELECT * FROM question WHERE quiz_id = ? ORDER BY sort_order').all(session.quiz_id);
      const scores = db.prepare(`
        SELECT display_name, team_name, score FROM participant
        WHERE session_id = ? ORDER BY score DESC
      `).all(sessionId).map(p => ({ name: p.display_name, team: p.team_name, score: p.score }));

      if (session.status === 'waiting') {
        socket.emit('session:state', {
          status: 'waiting',
          questionIndex: 0,
          totalQuestions: questions.length,
          scores
        });
        return;
      }

      if (session.status === 'finished') {
        socket.emit('session:state', {
          status: 'finished',
          questionIndex: questions.length,
          totalQuestions: questions.length,
          scores
        });
        return;
      }

      // Active
      const currentQuestion = questions[session.current_question_index];
      if (!currentQuestion) return;

      const answers = db.prepare('SELECT * FROM answer WHERE question_id = ?').all(currentQuestion.id);

      socket.emit('session:state', {
        status: 'active',
        currentPhase: session.current_phase,
        question: { id: currentQuestion.id, text: currentQuestion.text, imageUrl: currentQuestion.image_url, type: currentQuestion.type },
        answers: answers.map(a => ({ id: a.id, text: a.text, partLabel: a.part_label || undefined })),
        questionIndex: session.current_question_index,
        totalQuestions: questions.length,
        scores
      });
    });
  });
}
