import { ScrollArea } from "@/components/Common/ScrollArea";
import { RootStore } from "@/store";
import { LuminaStore } from "@/store/luminaStore";
import { _ } from "@/lib/lodash";
import { observer } from "mobx-react-lite";
import { useEffect } from "react";
import { useLocation, useSearchParams } from 'react-router-dom';
import { LuminaCard } from "@/components/LuminaCard";
import { LoadingAndEmpty } from "@/components/Common/LoadingAndEmpty";

const Detail = observer(() => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const Lumina = RootStore.Get(LuminaStore);

  useEffect(() => {
    if (searchParams.get('id')) {
      Lumina.noteDetail.call({ id: Number(searchParams.get('id')) });
    }
  }, [location.pathname, searchParams.get('id'), Lumina.updateTicker, Lumina.forceQuery]);

  return (
    <ScrollArea fixMobileTopBar>
      <div className="max-w-[800px] mx-auto p-4">
        <LoadingAndEmpty
          isLoading={Lumina.noteDetail.loading.value}
          isEmpty={!Lumina.noteDetail.value}
        />

        {Lumina.noteDetail.value && (
          <LuminaCard
            LuminaItem={Lumina.noteDetail.value}
            defaultExpanded={false}
            glassEffect={false}
          />
        )}
      </div>
    </ScrollArea>
  );
});

export default Detail;