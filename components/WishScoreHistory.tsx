'use client';

import {
  useEffect,
  useState
} from 'react';

import { supabase }
from '../lib/supabase';

interface Props {
  address?: string;
  open: boolean;
  onClose: () => void;
}

interface HistoryItem {
  id: string;
  points: number;
  reason: string;
  created_at: number;
}

export default function WishScoreHistory({
  address,
  open,
  onClose
}: Props) {

  const [
    history,
    setHistory
  ] = useState<
    HistoryItem[]
  >([]);

  useEffect(() => {

    if (!open || !address) {
      return;
    }

    async function load() {

      const { data } =
        await supabase
          .from(
            'wishscore_history'
          )
          .select('*')
          .eq(
            'user_address',
            address
          )
          .order(
            'created_at',
            {
              ascending: false
            }
          )
          .limit(50);

      setHistory(data || []);
    }

    load();

  }, [open, address]);

  if (!open) return null;

  return (

    <div className="
      fixed inset-0
      z-[100]

      flex
      items-center
      justify-center

      px-4
    ">

      <div
        onClick={onClose}
        className="
          absolute inset-0
          bg-black/70
          backdrop-blur-md
        "
      />

      <div className="
        relative

        w-full
        max-w-xl

        rounded-3xl

        border
        border-orange-500/10

        bg-[#07111f]

        p-6
      ">

        <div className="
          flex
          items-center
          justify-between

          mb-6
        ">

          <h2 className="
            text-2xl
            font-black
          ">
            ⭐ WishScore History
          </h2>

          <button
            onClick={onClose}
            className="
              text-slate-500
              hover:text-white
              text-xl
            "
          >
            ✕
          </button>

        </div>

        <div className="
          space-y-3
          max-h-[500px]
          overflow-y-auto
        ">

          {history.length === 0 ? (

            <div className="
              text-center
              py-12
              text-slate-500
            ">
              No WishScore activity yet
            </div>

          ) : (

            history.map(item => (

              <div
                key={item.id}
                className="
                  rounded-2xl

                  border
                  border-white/5

                  bg-white/[0.03]

                  p-4
                "
              >

                <div className="
                  flex
                  items-center
                  justify-between
                ">

                  <div>

                    <div className="
                      text-white
                      font-semibold
                    ">
                      {item.reason}
                    </div>

                    <div className="
                      text-xs
                      text-slate-500
                      mt-1
                    ">
                      {
                        new Date(
                          item.created_at
                        ).toLocaleString()
                      }
                    </div>

                  </div>

                  <div className="
                    text-lg
                    font-black
                    text-amber-400
                  ">
                    +{item.points}
                  </div>

                </div>

              </div>
            ))
          )}

        </div>

      </div>

    </div>
  );
}