import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { useRoom, useCreateItem, useUploadImage, useDeleteItem, useReorderItem, useUpdateItem, CreateItemPayload } from '../hooks/useRooms';
import { useAuthStore } from '../store/useAuthStore';
import { Skeleton } from '../components/common/Skeleton';
import { CheckCircle2, Lock, Upload, ArrowUp, ArrowDown, Trash2, Edit2 } from 'lucide-react';

export function RoomSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: room, isLoading, isError } = useRoom(id);
  const createItemMutation = useCreateItem();
  const uploadImageMutation = useUploadImage();
  const deleteItemMutation = useDeleteItem();
  const reorderItemMutation = useReorderItem();
  const updateItemMutation = useUpdateItem();

  const [formData, setFormData] = useState<Omit<CreateItemPayload, 'roomId'>>({
    name: '',
    description: '',
    startingPrice: 1000,
    auctionType: 'OPEN',
    timerDuration: 30,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // 호스트 가드
  useEffect(() => {
    if (room && user && room.hostId !== user.id) {
      alert('방 설정은 개설자만 접근할 수 있습니다.');
      navigate(`/room/${id}`);
    }
  }, [room, user, id, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'startingPrice' || name === 'timerDuration') ? Number(value) : value,
    }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', startingPrice: 1000, auctionType: 'OPEN', timerDuration: 30 });
    setImagePreview(null);
    setSelectedFile(null);
    setEditingItemId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEdit = (item: any) => {
    setEditingItemId(item.id);
    setFormData({
      name: item.name,
      description: item.description || '',
      startingPrice: item.startingPrice,
      auctionType: item.auctionType,
      timerDuration: item.timerDuration,
      imageUrl: item.imageUrl // Keep previous so it won't disappear if no new file is added
    });
    setImagePreview(item.imageUrl || null);
    setSelectedFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      let imageUrl = formData.imageUrl; // Retain existing imageUrl by default during edit

      if (selectedFile) {
        const result = await uploadImageMutation.mutateAsync(selectedFile);
        imageUrl = result.imageUrl;
      }

      if (editingItemId) {
        await updateItemMutation.mutateAsync({
          roomId: id,
          itemId: editingItemId,
          payload: { ...formData, imageUrl },
        });
      } else {
        await createItemMutation.mutateAsync({
          roomId: id,
          ...formData,
          imageUrl,
        });
      }
      resetForm();
    } catch (err) {
      alert('처리에 실패했습니다.');
    }
  };

  if (isLoading) return <div style={{ padding: '24px' }}><Skeleton height={400} /></div>;
  if (isError || !room) return <div style={{ padding: '24px', color: 'var(--danger)' }}>방 정보를 불러올 수 없습니다.</div>;
  if (room.hostId !== user?.id) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Card title={`경매 설정: ${room.title}`}>
        <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: '24px' }}>
          {editingItemId ? '기존에 등록한 아이템 정보를 수정합니다.' : '경매에 부칠 새로운 아이템을 등록하세요.'}
        </p>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* 이미지 업로드 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>아이템 사진 (드래그앤드롭 가능)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                width: '100%', aspectRatio: '16/9', borderRadius: 'var(--border-radius-md)',
                border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border-color)'}`, 
                cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                overflow: 'hidden', position: 'relative',
                background: dragActive ? 'rgba(49,130,246,0.1)' : (imagePreview ? 'transparent' : 'var(--bg-color)'),
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="미리보기"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <Upload size={32} style={{ color: 'var(--text-secondary)', marginBottom: '8px' }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>클릭하여 이미지를 선택하세요</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>JPG, PNG, GIF, WebP (최대 10MB)</span>
                </>
              )}
            </div>
          </div>

          <Input 
            label="아이템 이름" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            placeholder="예) 한정판 콜라보레이션 운동화" 
            required 
          />
          <Input 
            label="간단한 설명" 
            name="description" 
            value={formData.description} 
            onChange={handleChange} 
            placeholder="예) 상자 풀 소장 미개봉품" 
          />
          <Input 
            label="시작 가격(P)" 
            type="number" 
            name="startingPrice" 
            value={formData.startingPrice} 
            onChange={handleChange} 
            min={100} 
            required 
          />
          <Input 
            label="카운트다운 시간 (초)" 
            type="number" 
            name="timerDuration" 
            value={formData.timerDuration} 
            onChange={handleChange} 
            min={10} 
            max={300} 
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 600 }}>경매 방식 선택</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button 
                type="button"
                variant={formData.auctionType === 'OPEN' ? 'primary' : 'secondary'}
                onClick={() => setFormData({ ...formData, auctionType: 'OPEN' })}
                style={{ flex: 1, display: 'flex', gap: '8px', justifyContent: 'center' }}
              >
                <CheckCircle2 size={18} /> 공개 입찰
              </Button>
              <Button 
                type="button"
                variant={formData.auctionType === 'BLIND' ? 'primary' : 'secondary'}
                onClick={() => setFormData({ ...formData, auctionType: 'BLIND' })}
                style={{ flex: 1, display: 'flex', gap: '8px', justifyContent: 'center' }}
              >
                <Lock size={18} /> 블라인드
              </Button>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {formData.auctionType === 'OPEN' 
                ? '최고 입찰가가 실시간으로 공개됩니다.' 
                : '입찰 현황이 숨겨지며 심리전을 펼칩니다.'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button type="submit" disabled={createItemMutation.isPending || updateItemMutation.isPending || uploadImageMutation.isPending} style={{ flex: 1 }}>
              {uploadImageMutation.isPending ? '이미지 업로드 중...' : (editingItemId ? '변경 사항 저장' : '아이템 등록하기')}
            </Button>
            {editingItemId && (
              <Button type="button" variant="secondary" onClick={resetForm} style={{ flex: 1 }}>
                수정 취소
              </Button>
            )}
          </div>
        </form>
      </Card>

      {/* 등록된 아이템 리스트 */}
      <Card title={`등록된 아이템 목록 (${room.items?.length || 0})`}>
        {room.items?.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>등록된 아이템이 없습니다.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {room.items?.map((item, index) => (
              <div key={item.id} style={{
                display: 'flex', gap: '12px', padding: '12px',
                backgroundColor: 'var(--bg-color)', borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--border-color)'
              }}>
                {/* 썸네일 */}
                <div style={{
                  width: '64px', height: '64px', borderRadius: '8px', overflow: 'hidden',
                  background: '#eee', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: '24px' }}>📦</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>#{index + 1}</span>
                    {item.name}
                    <span style={{
                      fontSize: '11px', padding: '2px 8px', borderRadius: '12px',
                      background: item.auctionType === 'OPEN' ? 'rgba(49,130,246,0.1)' : 'rgba(240,68,82,0.1)',
                      color: item.auctionType === 'OPEN' ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {item.auctionType === 'OPEN' ? '공개' : '블라인드'}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    시작가: {item.startingPrice.toLocaleString()}P · 타이머: {item.timerDuration}초
                  </div>
                </div>
                
                {/* 컨트롤 버튼 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', justifyContent: 'center' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      title="수정하기"
                      onClick={() => startEdit(item)}
                      disabled={item.status !== 'PENDING'}
                      style={{ background: 'var(--glass-bg)', border: 'none', borderRadius: '4px', padding: '4px', cursor: item.status === 'PENDING' ? 'pointer' : 'not-allowed', color: item.status === 'PENDING' ? 'var(--primary)' : 'var(--border-color)' }}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      title="위로 이동"
                      disabled={index === 0 || reorderItemMutation.isPending}
                      onClick={() => id && reorderItemMutation.mutate({ roomId: id, itemId: item.id, direction: 'up' })}
                      style={{ background: 'var(--glass-bg)', border: 'none', borderRadius: '4px', padding: '4px', cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? 'var(--border-color)' : 'var(--text-primary)' }}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      title="아래로 이동"
                      disabled={index === (room.items?.length || 0) - 1 || reorderItemMutation.isPending}
                      onClick={() => id && reorderItemMutation.mutate({ roomId: id, itemId: item.id, direction: 'down' })}
                      style={{ background: 'var(--glass-bg)', border: 'none', borderRadius: '4px', padding: '4px', cursor: index === (room.items?.length || 0) - 1 ? 'not-allowed' : 'pointer', color: index === (room.items?.length || 0) - 1 ? 'var(--border-color)' : 'var(--text-primary)' }}
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                  <button
                    title="삭제하기"
                    onClick={() => {
                      if (window.confirm('이 아이템을 삭제하시겠습니까?')) {
                        id && deleteItemMutation.mutate({ roomId: id, itemId: item.id });
                      }
                    }}
                    disabled={deleteItemMutation.isPending || item.status !== 'PENDING'}
                    style={{ background: 'rgba(240,68,82,0.1)', border: 'none', borderRadius: '4px', padding: '4px', cursor: item.status === 'PENDING' ? 'pointer' : 'not-allowed', color: item.status === 'PENDING' ? 'var(--danger)' : 'var(--border-color)', display: 'flex', justifyContent: 'center' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Button variant="primary" onClick={() => navigate(`/room/${id}/host`)} 
            disabled={(room.items?.length || 0) === 0}
            style={{ width: '100%', padding: '16px' }}>
            🎤 호스트 제어판으로 이동
          </Button>
          <Button variant="secondary" onClick={() => navigate('/')} style={{ width: '100%' }}>
            로비로 나가기
          </Button>
        </div>
      </Card>
    </div>
  );
}
