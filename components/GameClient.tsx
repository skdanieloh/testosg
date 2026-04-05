"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { apiGetRoom, apiPostRoom } from "@/lib/api/roomClient";
import { roomToRecordRows } from "@/lib/records/mapRoom";
import {
  createGame,
  GAME_CANVAS_H,
  GAME_CANVAS_W,
  type GameController,
} from "@/lib/game/runGame";
import { TouchPad } from "@/components/TouchPad";
import { RankingTable } from "@/components/RankingTable";
import { sortRecords } from "@/lib/ranking";
import type { RecordRow } from "@/types/record";

type Props = {
  nickname: string;
};

export function GameClient({ nickname }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<GameController | null>(null);
  const [replayId, setReplayId] = useState(0);
  const [hud, setHud] = useState({ score: 0, level: 1 });
  const [over, setOver] = useState<{
    score: number;
    level: number;
  } | null>(null);
  const [rankSnapshot, setRankSnapshot] = useState<RecordRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadRanking = useCallback(async () => {
    const { ok, data } = await apiGetRoom();
    if (ok && data?.ok && data.room) {
      setRankSnapshot(
        sortRecords(roomToRecordRows(data.room, { approvedOnly: true }))
      );
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = createGame(canvas, {
      carIndex: 0,
      theme: "dark",
      callbacks: {
        onFrame: (s) => setHud(s),
        onGameOver: async (result) => {
          setOver(result);
          setSubmitting(true);
          try {
            const { ok, data } = await apiPostRoom({
              action: "score",
              name: nickname,
              score: result.score,
              level: result.level,
            });
            if (!ok) console.error(data);
            await loadRanking();
          } finally {
            setSubmitting(false);
          }
        },
      },
    });
    gameRef.current = game;
    game.start();

    return () => {
      game.stop();
      gameRef.current = null;
    };
  }, [nickname, replayId, loadRanking]);

  const move = (d: -1 | 1) => gameRef.current?.moveLane(d);

  function handleReplay() {
    setOver(null);
    setReplayId((n) => n + 1);
  }

  return (
    <div className="flex w-full max-w-full flex-col items-stretch gap-3">
      {!over && (
        <div className="glass-hud w-full text-slate-200">
          <span>
            점수 <strong className="text-white">{hud.score}</strong>
          </span>
          <span>
            레벨 <strong className="text-white">{hud.level}</strong>
          </span>
        </div>
      )}

      <div className="glass-canvas-frame">
        <canvas
          ref={canvasRef}
          width={GAME_CANVAS_W}
          height={GAME_CANVAS_H}
          className="block h-auto w-full max-w-none touch-none"
        />
        {over && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto border-t border-white/[0.08] bg-slate-950/75 p-4 pt-safe pb-safe-game text-center backdrop-blur-2xl">
            <p className="text-xl font-bold text-white">GAME OVER</p>
            <p className="text-slate-400">
              점수 <span className="text-white">{over.score}</span> · 레벨{" "}
              <span className="text-white">{over.level}</span>
            </p>
            {submitting && (
              <p className="text-xs text-slate-500">기록 저장 중…</p>
            )}
            <div className="mt-2 w-full max-w-sm text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                방 랭킹
              </p>
              <RankingTable rows={rankSnapshot} highlightNickname={nickname} />
            </div>
            <div className="mt-3 flex w-full max-w-xs flex-col gap-2">
              <Link
                href="/ranking"
                className="glass-button-primary py-3 text-center text-base"
              >
                전체 랭킹
              </Link>
              <button
                type="button"
                className="glass-button py-3 text-base text-slate-100"
                onClick={handleReplay}
              >
                다시 하기
              </button>
            </div>
          </div>
        )}
      </div>

      {!over && <TouchPad onLeft={() => move(-1)} onRight={() => move(1)} />}
    </div>
  );
}
