import { createFileRoute, useLocation } from "@tanstack/react-router";
import CloseAlertDialog from "@/features/alert/components/CloseAlertDialog";
import Chat from "@/features/chat/components/Chat";
import AlertDetailCard from "@/features/alert/components/AlertDetailCard";
import ContactCard from "@/features/video-call/components/ContactCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import useAlert from "@/features/alert/hooks/useAlert";
import { AuthUser } from "aws-amplify/auth";
import MeetingVideoCard from "@/features/video-call/components/MeetingVideoCard";
import { PiChartLine } from 'react-icons/pi';
import { LuBrainCircuit } from 'react-icons/lu';
import { useState } from 'react';
import useChart, { LOAD_MODE } from '@/features/alert/hooks/useChart';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ChartPanel from '@/features/alert/components/ChartPanel';

let user: AuthUser | undefined;

type TabProps = {
  id: string;
  name: string;
};


export const Route = createFileRoute("/_layout/alert/$alertId")({
  loader: ({ context }) => {
    user = context.user;
  },
  component: () => {
    return <AlertDetailPage user={user}></AlertDetailPage>;
  },
});

type ComponentProps = {
  user: AuthUser | undefined;
};

const tabItems = [
  { id: 'chat', name: 'AI Chat', icon: <LuBrainCircuit /> },
  { id: 'trend', name: 'Trend', icon: <PiChartLine /> },
];



function AlertDetailPage(props: ComponentProps) {
  user = props.user;
  const location = useLocation();
  const { alerts, closeWithComment } = useAlert();
  const alertId = location.pathname.split("/")[2];
  const alert =
    alertId && alerts ? alerts.find((alert) => alert.id === alertId) : null;

  const onCloseSubmit = (comment: string) => {
    if (alert) {
      console.log("Closing alert", alert.id, "with comment", comment);
      closeWithComment(alert.id, comment);
    }
  };
  
  const loopName = alert?.name.split('_')[0] ?? '';
  const { chart, mode, setMode } = useChart({
    loopName,
    openedAt: alert?.openedAt,
  });
  
  const [selectedTab, setSelectedTab] = useState<TabProps>(tabItems[0]);

  const onTabChange = (value: string) => {
    setSelectedTab(
      tabItems.find((tabItem) => tabItem.id === value) ?? tabItems[0]
    );
  };
  
  const onChartModeChange = (value: LOAD_MODE) => {
    if (value !== mode) {
      setMode(value);
    }
  };
  
  return (
    <>
      <div className="block md:grid md:grid-cols-[600px_minmax(0,1fr)]">
        <div className="md:sticky md:top-12 md:z-30 md:h-[calc(100vh-49px)]">
          <ScrollArea className="relative h-full flex-1 overflow-hidden px-8">
            <div className="h-full">
              <div className="flex justify-end py-2">
                <CloseAlertDialog
                  onSubmit={onCloseSubmit}
                  disabled={alert?.status === "CLOSED"}
                />
              </div>

              {alert && (
                <>
                  <AlertDetailCard item={alert} />
                  <ContactCard
                    myName={user?.username ?? ""}
                    alertId={alertId}
                  />
                  <MeetingVideoCard alertId={alert.id}></MeetingVideoCard>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
        <div className="relative flex flex-col bg-secondary">
          <div className="grid place-items-center bg-popover py-2">
            <Tabs
              defaultValue="chat"
              className="hidden md:block"
              onValueChange={onTabChange}>
              <TabsList className="grid w-full grid-cols-2">
                {tabItems.map((tabItem) => (
                  <TabsTrigger key={tabItem.id} value={tabItem.id}>
                    <span className="pr-2">{tabItem.icon}</span>
                    <span>{tabItem.name}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          {alert && (
            <>
              {selectedTab.id === 'chat' && (
                <Chat alertId={alert.id} alertCategory={alert.category} />
              )}
              {selectedTab.id === 'trend' && (
                <div>
                  {chart && (
                    <ChartPanel
                      data={chart}
                      loopName={loopName}
                      onModeChange={onChartModeChange}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
