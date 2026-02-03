import { useState } from 'react';
import { FaRocket, FaChevronRight } from 'react-icons/fa';
import { GiCrossedSwords } from 'react-icons/gi';
import './QuickActions.css';

import SessionEntryModal from './SessionEntryModal';
import PlayersBattleModal from './PlayersBattleModal';

const QuickActions = () => {
    const [activeModal, setActiveModal] = useState<'session' | 'battle' | null>(null);

    return (
        <>
            <div className="quick-actions-container">
                {/* Session Action */}
                <div
                    className="action-card session"
                    onClick={() => setActiveModal('session')}
                >
                    <div className="action-icon-wrapper">
                        <FaRocket />
                    </div>
                    <div className="action-content">
                        <h3 className="action-title">Start New Session</h3>
                        <p className="action-desc">Assign devices and start timing</p>
                    </div>
                    <div className="action-arrow">
                        <FaChevronRight />
                    </div>
                </div>

                {/* Battle Action */}
                <div
                    className="action-card battle"
                    onClick={() => setActiveModal('battle')}
                >
                    <div className="action-icon-wrapper">
                        <GiCrossedSwords />
                    </div>
                    <div className="action-content">
                        <h3 className="action-title">Start Players Battle</h3>
                        <p className="action-desc">Register 1v1 match & tracking</p>
                    </div>
                    <div className="action-arrow">
                        <FaChevronRight />
                    </div>
                </div>
            </div>

            {/* Modals */}
            <SessionEntryModal
                isOpen={activeModal === 'session'}
                onClose={() => setActiveModal(null)}
            />

            <PlayersBattleModal
                isOpen={activeModal === 'battle'}
                onClose={() => setActiveModal(null)}
            />
        </>
    );
};

export default QuickActions;
