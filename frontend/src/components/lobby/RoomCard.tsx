import { Room } from '../../hooks/useRooms';
import { motion } from 'framer-motion';
import { Users, Gavel } from 'lucide-react';

interface RoomCardProps {
  room: Room;
  onClick: (id: string) => void;
}

export function RoomCard({ room, onClick }: RoomCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: 'var(--shadow-md)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(room.id)}
      style={{
        backgroundColor: 'var(--panel-bg)',
        borderRadius: 'var(--border-radius-md)',
        padding: '20px',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {room.title}
        </h3>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {new Date(room.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          <Users size={16} />
          <span>{room.host.username}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '14px' }}>
          <Gavel size={16} />
          <span>등록된 아이템: {room._count.items}</span>
        </div>
      </div>
    </motion.div>
  );
}
