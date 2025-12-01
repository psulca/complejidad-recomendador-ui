"use client";
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, List, X } from "lucide-react";
import Link from "next/link";

// Importación ForceGraph 
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => <div className="text-slate-400">Cargando motor gráfico...</div>
});

interface GraphNode {
  id: string; // PK compuesta: codigo|carrera
  label: string;
  nivel?: number;
  creditos?: number;
  carrera?: string;
  codigo?: string; // Código sin carrera
  creditos_generales_requeridos?: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  color?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  tipo?: string; // "COURSE" o "COURSE_CRED"
  creditos_requeridos?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export default function MallaPage() {
  const [data, setData] = useState<{ nodes: GraphNode[]; links: GraphLink[] }>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [carreras, setCarreras] = useState<string[]>([]);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>("all");
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(null);

  // Cargar carreras
  useEffect(() => {
    axios.get('/api/carreras')
      .then(res => {
        const carrerasData = res.data;
        let carrerasArray: string[] = [];
        
        if (Array.isArray(carrerasData)) {
          carrerasArray = carrerasData;
        } else if (carrerasData && typeof carrerasData === 'object') {
          carrerasArray = Array.isArray(carrerasData.carreras) ? carrerasData.carreras :
                         Array.isArray(carrerasData.data) ? carrerasData.data :
                         Object.values(carrerasData).filter(v => typeof v === 'string') as string[];
        }
        
        setCarreras(carrerasArray);
      })
      .catch(err => {
        console.error("Error al cargar carreras:", err);
        setCarreras([]);
      });
  }, []);

  // Cargar grafo cuando cambia la carrera
  useEffect(() => {
    let cancelled = false;
    
    const loadGraph = async () => {
      setLoading(true);
      
      const url = carreraSeleccionada && carreraSeleccionada !== "all"
        ? `/api/grafo?carrera=${encodeURIComponent(carreraSeleccionada)}`
        : '/api/grafo';
      
      try {
        const res = await axios.get(url);
        if (cancelled) return;
        const nodes = res.data.nodes || [];
        const edges = res.data.edges || [];

        // Transformar nodos para usar PK compuesta (codigo|carrera)
        const nodesTransformados: GraphNode[] = nodes.map((node: { id: string; label: string; nivel?: number; creditos?: number; carrera?: string; creditos_generales_requeridos?: number }) => {
          const codigo = node.id; // El backend ya devuelve el código extraído
          const carrera = node.carrera || '';
          // PK compuesta: codigo|carrera
          const pk = carrera ? `${codigo}|${carrera}` : codigo;
          
          return {
            id: pk,
            codigo: codigo,
            label: node.label,
            nivel: node.nivel,
            creditos: node.creditos,
            carrera: carrera,
            creditos_generales_requeridos: node.creditos_generales_requeridos
          };
        });

        // Transformar links para usar PK compuesta y preservar información de créditos
        const linksTransformados: GraphLink[] = edges.map((edge: { source: string; target: string; tipo?: string; creditos_requeridos?: number }) => {
          // Buscar los nodos correspondientes para obtener la PK compuesta
          const sourceNode = nodesTransformados.find(n => n.codigo === edge.source);
          const targetNode = nodesTransformados.find(n => n.codigo === edge.target);
          
          return {
            source: sourceNode?.id || edge.source,
            target: targetNode?.id || edge.target,
            tipo: edge.tipo || "COURSE",
            creditos_requeridos: edge.creditos_requeridos
          };
        });

        // Configuración de la grilla
        const SPACING_X = 200; 
        const SPACING_Y = 80;

        // Agrupar por niveles
        const levels: { [key: number]: GraphNode[] } = {};
        nodesTransformados.forEach((node: GraphNode) => {
          const lvl = node.nivel || 0;
          if (!levels[lvl]) levels[lvl] = [];
          levels[lvl].push(node);
        });

        // Calcular posiciones fijas
        Object.keys(levels).forEach((key) => {
          const lvl = parseInt(key);
          const levelNodes = levels[lvl];
          // Ordenar por código (no por PK completa)
          levelNodes.sort((a, b) => (a.codigo || a.id).localeCompare(b.codigo || b.id));
          
          levelNodes.forEach((node, index) => {
            node.fx = (lvl - 5) * SPACING_X;
            const totalHeight = (levelNodes.length - 1) * SPACING_Y;
            node.fy = (index * SPACING_Y) - (totalHeight / 2);
          });
        });

        setData({ nodes: nodesTransformados, links: linksTransformados });
        console.log("Grafo cargado:", res.data);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error(err);
        setLoading(false);
      }
    };
    
    loadGraph();
    
    return () => {
      cancelled = true;
    };
  }, [carreraSeleccionada]);

  return (
    <div 
      className="relative w-full h-screen bg-slate-900 overflow-hidden"
      onMouseMove={(e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
      }}
    >
      
      <div className="absolute top-4 left-4 z-50">
        <Link href="/">
          <Button variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/20 backdrop-blur-md">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Planificador
          </Button>
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2 items-end">
        <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-md p-3 min-w-[200px]">
          <Label className="text-slate-300 text-xs mb-2 block">Filtrar por Carrera</Label>
          <Select
            value={carreraSeleccionada}
            onValueChange={(value) => {
              setCarreraSeleccionada(value);
            }}
          >
            <SelectTrigger className="w-full bg-slate-700/50 border-slate-600 text-slate-200">
              <SelectValue placeholder="Selecciona una carrera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las carreras</SelectItem>
              {Array.isArray(carreras) && carreras.length > 0 ? (
                carreras.map((carrera) => (
                  <SelectItem key={carrera} value={carrera}>
                    {carrera}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="loading" disabled>Cargando carreras...</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary" className="bg-indigo-500/20 text-indigo-200 border-indigo-500/50 backdrop-blur-md">
          {data.nodes?.length || 0} Cursos
        </Badge>
        <Badge variant="secondary" className="bg-pink-500/20 text-pink-200 border-pink-500/50 backdrop-blur-md">
          {data.links?.length || 0} Conexiones
        </Badge>
        <Button 
          size="sm" 
          variant="outline" 
          className="bg-slate-800/50 text-slate-200 border-slate-700 backdrop-blur-md mt-2"
          onClick={() => setShowLegend(!showLegend)}
        >
          {showLegend ? <X className="mr-2 h-4 w-4" /> : <List className="mr-2 h-4 w-4" />}
          {showLegend ? "Cerrar Leyenda" : "Ver Leyenda"}
        </Button>
      </div>

      {showLegend && (
        <div className="absolute top-0 right-0 h-full w-80 bg-slate-900/95 border-l border-slate-700 z-40 pt-20 pb-4 px-4 backdrop-blur-sm transition-all animate-in slide-in-from-right flex flex-col overflow-hidden">
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2 shrink-0">
            <List className="w-5 h-5 text-indigo-400"/> Leyenda de Cursos
          </h2>
          <ScrollArea className="h-px flex-1 -mr-4 pr-4">
            <div className="space-y-6 pr-4">

              {Object.entries(
                data.nodes.reduce((acc: Record<number, GraphNode[]>, node: GraphNode) => {
                  const lvl = node.nivel || 0;
                  if (!acc[lvl]) acc[lvl] = [];
                  acc[lvl].push(node);
                  return acc;
                }, {})
              ).map(([level, nodes]) => (
                <div key={level}>
                  <h3 className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2 border-b border-indigo-500/20 pb-1">
                    Nivel {level}
                  </h3>
                  <div className="space-y-2">
                    {(nodes as GraphNode[]).sort((a, b) => (a.codigo || a.id).localeCompare(b.codigo || b.id)).map((node) => (
                      <div 
                        key={node.id} 
                        className="group flex flex-col p-2 rounded hover:bg-white/5 cursor-pointer transition-colors"
                        onClick={() => {
                          if (graphRef.current) {
                            graphRef.current.centerAt(node.x, node.y, 1000);
                            graphRef.current.zoom(2.5, 1000);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-indigo-300 font-bold text-sm">{node.codigo || node.id.split('|')[0] || node.id}</span>
                          <Badge variant="outline" className="text-[10px] border-slate-600 text-slate-400">
                            {node.creditos} cr
                          </Badge>
                        </div>
                        <p className="text-slate-300 text-xs mt-1 group-hover:text-white transition-colors">
                          {node.label}
                        </p>
                        {carreraSeleccionada !== "all" && node.creditos_generales_requeridos && (
                          <p className="text-yellow-400 text-[10px] mt-1 font-semibold">
                            Requiere {node.creditos_generales_requeridos} CRED generales
                          </p>
                        )}
                        {node.carrera && (
                          <p className="text-slate-500 text-[10px] mt-1">
                            {node.carrera}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {loading ? (
        <div className="flex h-full items-center justify-center text-white">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
          <span className="ml-3">Generando visualización...</span>
        </div>
      ) : (
         <ForceGraph2D
           ref={graphRef}
           graphData={data}
           nodeLabel=""
           nodeAutoColorBy="nivel"
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           onNodeHover={(node: any) => {
             if (node) {
               const n = node as GraphNode;
               let content = n.label || '';
               // Solo mostrar créditos generales si se seleccionó una carrera específica
               if (carreraSeleccionada !== "all" && n.creditos_generales_requeridos) {
                 content += '\nRequiere ' + n.creditos_generales_requeridos + ' CRED generales';
               }
               setTooltip({ content, x: mousePos.x, y: mousePos.y });
             } else {
               setTooltip(null);
             }
           }}
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           onNodeClick={(node: any) => {
             const n = node as GraphNode;
             // Si se hace click en el mismo nodo, deseleccionar
             if (selectedNode?.id === n.id) {
               setSelectedNode(null);
               // Zoom out suave sin recargar
               if (graphRef.current) {
                 setTimeout(() => {
                   if (graphRef.current) {
                     graphRef.current.zoomToFit(800);
                   }
                 }, 50);
               }
             } else {
               // Actualizar selección primero
               setSelectedNode(n);
               // Zoom al nodo seleccionado con animación más suave
               if (graphRef.current && n.x !== undefined && n.y !== undefined) {
                 // Usar setTimeout para permitir que el estado se actualice primero
                 setTimeout(() => {
                   if (graphRef.current && n.x !== undefined && n.y !== undefined) {
                     graphRef.current.centerAt(n.x, n.y, 1500);
                     graphRef.current.zoom(1.8, 1500);
                   }
                 }, 10);
               }
             }
           }}
           onBackgroundClick={() => {
             setTooltip(null);
             // Deseleccionar suavemente
             if (selectedNode) {
               setSelectedNode(null);
               if (graphRef.current) {
                 setTimeout(() => {
                   if (graphRef.current) {
                     graphRef.current.zoomToFit(800);
                   }
                 }, 50);
               }
             }
           }}
           onLinkClick={() => setTooltip(null)}
           nodeCanvasObject={(node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
             const n = node as GraphNode;
             // Mostrar solo el código, no la PK compuesta completa
             const label = n.codigo || n.id.split('|')[0] || n.id; 
             const fontSize = Math.max(10, 12/globalScale);
             const padding = 8;
             
             if (n.x !== undefined && n.y !== undefined) {
               // Medir el texto para calcular el ancho del rectángulo
               ctx.font = `${fontSize}px Sans-Serif`;
               const textMetrics = ctx.measureText(label);
               const textWidth = textMetrics.width;
               const rectWidth = textWidth + padding * 2;
               const rectHeight = fontSize + padding * 2;
               
               // Determinar si el nodo está seleccionado
               const isSelected = selectedNode?.id === n.id;
               
               // Dibujar rectángulo con fondo
               ctx.fillStyle = isSelected ? '#fbbf24' : (n.color || '#6366f1');
               ctx.strokeStyle = isSelected ? '#f59e0b' : '#fff';
               ctx.lineWidth = isSelected ? 3 : 2;
               
               // Rectángulo redondeado
               const radius = 6;
               const x = n.x - rectWidth / 2;
               const y = n.y - rectHeight / 2;
               
               ctx.beginPath();
               ctx.moveTo(x + radius, y);
               ctx.lineTo(x + rectWidth - radius, y);
               ctx.quadraticCurveTo(x + rectWidth, y, x + rectWidth, y + radius);
               ctx.lineTo(x + rectWidth, y + rectHeight - radius);
               ctx.quadraticCurveTo(x + rectWidth, y + rectHeight, x + rectWidth - radius, y + rectHeight);
               ctx.lineTo(x + radius, y + rectHeight);
               ctx.quadraticCurveTo(x, y + rectHeight, x, y + rectHeight - radius);
               ctx.lineTo(x, y + radius);
               ctx.quadraticCurveTo(x, y, x + radius, y);
               ctx.closePath();
               ctx.fill();
               ctx.stroke();

               // Texto del código
               ctx.textAlign = 'center';
               ctx.textBaseline = 'middle';
               ctx.fillStyle = '#fff';
               ctx.font = `bold ${fontSize}px Sans-Serif`;
               ctx.fillText(label, n.x, n.y);
             }
           }}
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           linkColor={(link: any) => {
             const l = link as GraphLink;
             
             // Si hay un nodo seleccionado, verificar si esta conexión está relacionada
             if (selectedNode) {
               const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
               const targetId = typeof l.target === 'string' ? l.target : l.target.id;
               const selectedId = selectedNode.id;
               
               // Si la conexión está relacionada con el nodo seleccionado, usar color destacado
               if (sourceId === selectedId || targetId === selectedId) {
                 return "#fbbf24"; // Amarillo brillante para conexiones del nodo seleccionado
               }
             }
             
             // Color según créditos requeridos (para conexiones no seleccionadas)
             const creditos = l.creditos_requeridos;
             
             // Si no tiene créditos requeridos (tipo COURSE sin créditos)
             if (!creditos && l.tipo !== "COURSE_CRED") {
               return "#475569"; // Gris para sin requisitos de créditos
             }
             
             // Si tiene créditos requeridos
             if (creditos && creditos <= 50) return "#22c55e"; // Verde para 0-50 créditos
             if (creditos && creditos <= 100) return "#eab308"; // Amarillo para 51-100 créditos
             if (creditos && creditos <= 150) return "#f97316"; // Naranja para 101-150 créditos
             if (creditos) return "#ef4444"; // Rojo para 150+ créditos
             return "#475569";
           }}
           // eslint-disable-next-line @typescript-eslint/no-explicit-any
           linkWidth={(link: any) => {
             const l = link as GraphLink;
             
             // Si hay un nodo seleccionado, hacer las conexiones relacionadas más gruesas
             if (selectedNode) {
               const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
               const targetId = typeof l.target === 'string' ? l.target : l.target.id;
               const selectedId = selectedNode.id;
               
               if (sourceId === selectedId || targetId === selectedId) {
                 return 4; // Más grueso para conexiones del nodo seleccionado
               }
             }
             
             return 2; // Grosor normal
           }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          linkLabel={(link: any) => {
            const l = link as GraphLink;
            const creditos = l.creditos_requeridos;
            
            // Obtener información del nodo target (curso destino)
            const target = typeof l.target === 'object' ? l.target : data.nodes.find(n => n.id === l.target);
            const nombreCurso = target?.label || '';
            
            if (!creditos && l.tipo !== "COURSE_CRED") {
              return nombreCurso ? `${nombreCurso}` : "Requisito directo (sin créditos)";
            }
            
            return nombreCurso ? `${nombreCurso}\nSe necesitan ${creditos} CRED` : `Se necesitan ${creditos} CRED`;
          }}
           backgroundColor="#0f172a"
           nodeRelSize={6}
           linkDirectionalArrowLength={3.5}
           linkDirectionalArrowRelPos={1}
           d3VelocityDecay={0.5}
           d3AlphaDecay={0.02}
           cooldownTicks={150}
           warmupTicks={0}
           onEngineStop={() => {
             // Solo hacer zoom inicial si no hay nodo seleccionado
             if (!selectedNode && graphRef.current) {
               graphRef.current.zoomToFit(400);
             }
           }}
           enablePanInteraction={true}
           enableZoomInteraction={true}
           enableNodeDrag={false}
        />
      )}
      
      {tooltip && (
        <div
          className="absolute pointer-events-none z-50 bg-slate-900/95 text-white text-xs rounded-md px-3 py-2 border border-slate-700 backdrop-blur-md shadow-lg"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: '-10px',
            whiteSpace: 'pre-line'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}