"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { BookOpen, Flame, GraduationCap, RefreshCw, Trash2, Search, Plus, Network, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Tipos
type Curso = {
  id: string;
  codigo: string;
  nombre: string;
  carrera: string;
  creditos: number;
  impacto: number;
  nivel?: number;
};

type Option = {
  value: string; // codigo + carrera (PK compuesta)
  label: string;
  codigo?: string;
  carrera?: string;
};

type CursoAprobado = {
  curso_codigo: string;
  carrera: string;
  nombre?: string;
  creditos?: number;
  nivel?: number;
  aprobado_en?: string;
};

type Usuario = {
  id: string;
  carrera: string;
  codigo_alumno: string;
  email: string;
  historial_aprobados: string[];
  creditos_totales: number;
};

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  const [maxCreditos, setMaxCreditos] = useState([22]); 
  const [historial, setHistorial] = useState<CursoAprobado[]>([]);
  const [historialOriginal, setHistorialOriginal] = useState<CursoAprobado[]>([]); // Historial guardado en backend
  const [catalogo, setCatalogo] = useState<Option[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [carreras, setCarreras] = useState<string[]>([]);
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>("");
  const [cicloSeleccionado, setCicloSeleccionado] = useState<string>("1");
  const [editandoInfo, setEditandoInfo] = useState(false);
  const [infoEditada, setInfoEditada] = useState({
    codigo_alumno: '',
    carrera: ''
  });
  
  const [recomendados, setRecomendados] = useState<Curso[]>([]);
  const [disponibles, setDisponibles] = useState<Curso[]>([]);

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);

  // Carga inicial de datos (solo una vez al montar)
  useEffect(() => {
    const loadData = async () => {
      try {
        // Obtener usuario de Supabase primero
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        setUser(currentUser);
        
        // Cargar carreras siempre
        const carrerasResponse = await Promise.allSettled([
          axios.get('/api/carreras')
        ]).then(results => results[0]);
        
        if (carrerasResponse.status === 'fulfilled') {
          const carrerasData = carrerasResponse.value.data;
          let carrerasArray: string[] = [];
          
          if (Array.isArray(carrerasData)) {
            carrerasArray = carrerasData;
          } else if (carrerasData && typeof carrerasData === 'object') {
            carrerasArray = Array.isArray(carrerasData.carreras) ? carrerasData.carreras :
                           Array.isArray(carrerasData.data) ? carrerasData.data :
                           Object.values(carrerasData).filter(v => typeof v === 'string') as string[];
          }
          
          setCarreras(carrerasArray);
        }
        
        // Si hay usuario autenticado, cargar datos del servidor (no usar localStorage)
        if (currentUser) {
          try {
            // Cargar usuario del backend
            const userResponse = await axios.get(`/api/usuario/${currentUser.id}`).catch(err => {
              if (axios.isAxiosError(err) && err.response?.status === 404) {
                console.log("Usuario no existe en backend, se creará cuando sea necesario");
                return null;
              }
              if (axios.isAxiosError(err) && err.response?.status !== 401) {
                console.error("Error al obtener usuario del backend:", err);
              }
              return null;
            });
            
            if (userResponse?.data) {
              const backendUser = userResponse.data;
              setUsuario(backendUser);
              
              if (backendUser.carrera) {
                setCarreraSeleccionada(backendUser.carrera);
                localStorage.setItem('carrera', backendUser.carrera);
              }
              
              localStorage.setItem('usuario', JSON.stringify(backendUser));
              
              // Cargar historial del servidor
              try {
                const historialUrl = `/api/usuario/${currentUser.id}/historial${backendUser.carrera ? `?carrera=${encodeURIComponent(backendUser.carrera)}` : ''}`;
                const historialResponse = await axios.get(historialUrl);
                if (historialResponse.data) {
                  const cursos = historialResponse.data.cursos || [];
                  setHistorial(cursos);
                  setHistorialOriginal(cursos);
                  localStorage.setItem('historial', JSON.stringify(cursos));
                }
              } catch (historialErr) {
                console.error("Error al cargar historial:", historialErr);
                // Si falla, intentar cargar desde localStorage como fallback
                const savedHistorial = localStorage.getItem('historial');
                if (savedHistorial) {
                  try {
                    const historialParsed = JSON.parse(savedHistorial);
                    if (Array.isArray(historialParsed)) {
                      setHistorial(historialParsed);
                      setHistorialOriginal(historialParsed);
                    }
                  } catch (e) {
                    console.error("Error al parsear historial de localStorage:", e);
                  }
                }
              }
            }
          } catch (err) {
            console.error("Error al cargar datos del usuario:", err);
          }
        } else {
          // Si NO hay usuario autenticado, usar localStorage como fallback
          const savedUser = localStorage.getItem('usuario');
          const savedHistorial = localStorage.getItem('historial');
          const savedMaxCreditos = localStorage.getItem('maxCreditos');
          const savedCarrera = localStorage.getItem('carrera');
          
          if (savedCarrera) {
            setCarreraSeleccionada(savedCarrera);
          }
          
          if (savedUser) {
            try {
              const parsedUser = JSON.parse(savedUser);
              setUsuario(parsedUser);
              if (parsedUser.carrera && !savedCarrera) {
                setCarreraSeleccionada(parsedUser.carrera);
                localStorage.setItem('carrera', parsedUser.carrera);
              }
            } catch (e) {
              console.error("Error al parsear usuario de localStorage:", e);
            }
          }
          
          if (savedHistorial) {
            try {
              const historialParsed = JSON.parse(savedHistorial);
              if (Array.isArray(historialParsed)) {
                const historialConvertido: CursoAprobado[] = historialParsed.map((item: unknown) => {
                  if (typeof item === 'object' && item !== null && 'curso_codigo' in item) {
                    return item as CursoAprobado;
                  }
                  const optionItem = item as Option;
                  const carrera = savedCarrera || '';
                  return {
                    curso_codigo: optionItem.codigo || optionItem.value?.split('|')[0] || optionItem.value,
                    carrera: optionItem.carrera || carrera,
                    nombre: optionItem.label
                  };
                });
                setHistorial(historialConvertido);
                setHistorialOriginal(historialConvertido);
              }
            } catch (e) {
              console.error("Error al parsear historial de localStorage:", e);
            }
          }
          
          if (savedMaxCreditos) {
            try {
              setMaxCreditos([parseInt(savedMaxCreditos)]);
            } catch (e) {
              console.error("Error al parsear maxCreditos de localStorage:", e);
            }
          }
        }
        
        // Si hay error de autenticación, simplemente continuar sin usuario
        if (userError && userError.message !== 'Invalid Refresh Token: Refresh Token Not Found') {
          console.warn('Error al obtener usuario:', userError.message);
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };

    loadData();
  }, [supabase]); // Solo ejecutar una vez al montar

  // El historial ahora se carga directamente desde el endpoint en loadData

  // Guardar cambios en localStorage cuando cambian
  useEffect(() => {
    if (historial.length > 0) {
      localStorage.setItem('historial', JSON.stringify(historial));
    }
  }, [historial]);

  useEffect(() => {
    localStorage.setItem('maxCreditos', maxCreditos[0].toString());
  }, [maxCreditos]);

  // Cargar cursos cuando cambia la carrera (carrera es obligatoria)
  useEffect(() => {
    const loadCursos = async () => {
      // La carrera es obligatoria, no cargar si no hay una seleccionada
      if (!carreraSeleccionada) {
        setCatalogo([]);
        return;
      }
      
      try {
        const res = await axios.get(`/api/cursos?carrera=${encodeURIComponent(carreraSeleccionada)}`);
        // Asegurar que siempre sea un array
        const cursosData = res.data;
        let cursosArray: { codigo?: string; id?: string; value?: string; nombre?: string; label?: string; carrera?: string }[] = [];
        
        if (Array.isArray(cursosData)) {
          cursosArray = cursosData;
        } else if (cursosData && typeof cursosData === 'object') {
          // Si es un objeto, intentar extraer un array
          cursosArray = Array.isArray(cursosData.cursos) ? cursosData.cursos : 
                       Array.isArray(cursosData.data) ? cursosData.data : [];
        }
        
        // Transformar cursos para incluir PK compuesta (codigo + carrera)
        // IMPORTANTE: Filtrar por carrera exacta (no contiene, sino igual)
        const cursosFiltradosPorCarrera = cursosArray.filter((curso: { carrera?: string }) => {
          // Coincidencia exacta de carrera (no contiene)
          return curso.carrera === carreraSeleccionada;
        });
        
        const catalogoTransformado = cursosFiltradosPorCarrera.map((curso: { codigo?: string; id?: string; value?: string; nombre?: string; label?: string; carrera?: string }) => {
          const codigo = curso.codigo || curso.id || curso.value || '';
          const carrera = curso.carrera || carreraSeleccionada;
          // PK compuesta: codigo + carrera (siempre incluye carrera)
          const pk = `${codigo}|${carrera}`;
          
          return {
            value: pk,
            label: curso.nombre || curso.label || codigo,
            codigo: codigo,
            carrera: carrera
          };
        });
        
        setCatalogo(catalogoTransformado);
        
        // Recargar historial si el usuario está autenticado y cambió la carrera
        // Usar el estado user en lugar de llamar a getUser() nuevamente
        if (user && usuario) {
          try {
            const historialUrl = `/api/usuario/${user.id}/historial?carrera=${encodeURIComponent(carreraSeleccionada)}`;
            const historialResponse = await axios.get(historialUrl);
            if (historialResponse.data) {
              const cursos = historialResponse.data.cursos || [];
              setHistorial(cursos);
              setHistorialOriginal(cursos); // Actualizar historial original
            }
          } catch (historialErr) {
            console.error("Error al recargar historial:", historialErr);
          }
        }
      } catch (err) {
        console.error("Error API cursos:", err);
        setCatalogo([]);
      }
    };
    loadCursos();
  }, [carreraSeleccionada, user, usuario]); // Incluir user y usuario en dependencias

  const cursosFiltrados = Array.isArray(catalogo) ? catalogo.filter(c => {
    // Filtro por búsqueda de texto
    const coincideBusqueda = c.label.toLowerCase().includes(busqueda.toLowerCase());
    
    // Filtro por carrera exacta (siempre debe coincidir, carrera es obligatoria)
    const coincideCarrera = c.carrera && c.carrera === carreraSeleccionada;
    
    // No debe estar en el historial
    const noEstaEnHistorial = !historial.find(h => h.curso_codigo === c.codigo && h.carrera === c.carrera);
    
    return coincideBusqueda && coincideCarrera && noEstaEnHistorial;
  }) : [];

  const agregarCurso = (curso: Option) => {
    const nivel = parseInt(cicloSeleccionado) || 1;
    
    // Buscar información del curso en el catálogo para obtener créditos y nombre completo
    const cursoEnCatalogo = catalogo.find(c => c.value === curso.value);
    
    const nuevoCurso: CursoAprobado = {
      curso_codigo: curso.codigo || curso.value.split('|')[0],
      carrera: curso.carrera || carreraSeleccionada,
      nombre: curso.label,
      nivel: nivel,
      creditos: cursoEnCatalogo ? undefined : undefined // Se obtendrá del backend al guardar
    };
    
    // Verificar que no esté duplicado
    const yaExiste = historial.some(h => 
      h.curso_codigo === nuevoCurso.curso_codigo && 
      h.carrera === nuevoCurso.carrera
    );
    
    if (yaExiste) {
      toast.error("Este curso ya está en el historial");
      return;
    }
    
    const nuevoHistorial = [...historial, nuevoCurso];
    setHistorial(nuevoHistorial);
    setBusqueda("");
    
    // Si no hay usuario autenticado (verificar con user de Supabase), guardar en localStorage inmediatamente
    if (!user?.id) {
      localStorage.setItem('historial', JSON.stringify(nuevoHistorial));
    }
  };

  const eliminarCurso = (curso: CursoAprobado) => {
    const nuevoHistorial = historial.filter(h => 
      !(h.curso_codigo === curso.curso_codigo && h.carrera === curso.carrera)
    );
    setHistorial(nuevoHistorial);
    
    // Si no hay usuario autenticado (verificar con user de Supabase), guardar en localStorage inmediatamente
    if (!user?.id) {
      localStorage.setItem('historial', JSON.stringify(nuevoHistorial));
    }
  };

  // Verificar si hay cambios pendientes
  const hayCambios = () => {
    if (!user?.id) return false; // Sin cambios pendientes si no hay usuario autenticado (verificar con user de Supabase)
    
    // Si ambos están vacíos, no hay cambios
    if (historial.length === 0 && historialOriginal.length === 0) return false;
    
    const historialActualIds = new Set(
      historial.map(h => `${h.curso_codigo}|${h.carrera}`)
    );
    const historialOriginalIds = new Set(
      historialOriginal.map(h => `${h.curso_codigo}|${h.carrera}`)
    );
    
    // Comparar si son diferentes
    if (historialActualIds.size !== historialOriginalIds.size) return true;
    
    for (const id of historialActualIds) {
      if (!historialOriginalIds.has(id)) return true;
    }
    
    // Verificar si hay cursos en original que no están en actual (eliminados)
    for (const id of historialOriginalIds) {
      if (!historialActualIds.has(id)) return true;
    }
    
    return false;
  };

  const guardarCambios = async () => {
    if (!user?.id) {
      toast.error("Debes iniciar sesión para guardar cambios");
      return;
    }

    // Siempre necesitamos el usuario del backend - intentar obtenerlo/crearlo si no existe
    let userIdParaUsar = usuario?.id;
    
    if (!userIdParaUsar) {
      try {
        // Intentar obtener el usuario directamente del backend
        const userResponse = await axios.get(`/api/usuario/${user.id}`);
        if (userResponse.data && userResponse.data.id) {
          setUsuario(userResponse.data);
          userIdParaUsar = userResponse.data.id;
        } else {
          // Si no existe, usar el ID de Supabase directamente
          userIdParaUsar = user.id;
        }
      } catch (err) {
        // Si el usuario no existe (404), usar el ID de Supabase directamente
        // El backend creará el usuario cuando sea necesario
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          userIdParaUsar = user.id;
        } else {
          console.error("Error al obtener usuario del backend:", err);
          // Si falla, intentar usar el ID de Supabase directamente
          if (user?.id) {
            userIdParaUsar = user.id;
          } else {
            toast.error("No se pudo obtener la información del usuario. Por favor, recarga la página.");
            return;
          }
        }
      }
    }

    setGuardando(true);
    try {
      // Primero verificar el estado actual del historial en el backend
      const historialUrl = `/api/usuario/${userIdParaUsar}/historial${carreraSeleccionada ? `?carrera=${encodeURIComponent(carreraSeleccionada)}` : ''}`;
      const historialBackendResponse = await axios.get(historialUrl);
      const historialBackend = historialBackendResponse.data?.cursos || [];
      const historialBackendVacio = historialBackend.length === 0;

      // Identificar cursos agregados y eliminados
      const historialActualIds = new Set(
        historial.map(h => `${h.curso_codigo}|${h.carrera}`)
      );
      const historialOriginalIds = new Set(
        historialOriginal.map(h => `${h.curso_codigo}|${h.carrera}`)
      );
      
      // Cursos a agregar (están en actual pero no en original)
      const cursosAAgregar = historial.filter(h => 
        !historialOriginalIds.has(`${h.curso_codigo}|${h.carrera}`)
      );
      
      // Cursos a eliminar (están en original pero no en actual)
      const cursosAEliminar = historialOriginal.filter(h => 
        !historialActualIds.has(`${h.curso_codigo}|${h.carrera}`)
      );

      // Cursos a actualizar (están en ambos pero pueden tener cambios)
      const cursosAActualizar = historial.filter(h => {
        const original = historialOriginal.find(
          orig => orig.curso_codigo === h.curso_codigo && orig.carrera === h.carrera
        );
        return original && (
          original.aprobado_en !== h.aprobado_en ||
          original.nivel !== h.nivel
        );
      });
      
      // Si el historial está vacío en el backend, crear todo con POST
      if (historialBackendVacio && historial.length > 0) {
        // Crear todos los cursos con POST (solo curso_codigo y carrera)
        for (const curso of historial) {
          try {
            if (!curso.curso_codigo || !curso.carrera) {
              console.error(`Curso inválido:`, curso);
              continue;
            }
            const response = await axios.post(`/api/usuario/${userIdParaUsar}/historial`, {
              curso_codigo: curso.curso_codigo,
              carrera: curso.carrera
            });
            console.log(`Curso ${curso.curso_codigo} agregado exitosamente:`, response.data);
          } catch (error) {
            if (axios.isAxiosError(error)) {
              console.error(`Error al agregar curso ${curso.curso_codigo}:`, {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
              });
            } else {
              console.error(`Error al agregar curso ${curso.curso_codigo}:`, error);
            }
          }
        }
      } else {
        // Si el historial tiene datos, usar PUT para actualizar y POST para agregar nuevos
        
        // Actualizar cursos existentes con PUT (solo aprobado_en si cambió)
        for (const curso of cursosAActualizar) {
          try {
            await axios.put(`/api/usuario/${userIdParaUsar}/historial/${curso.curso_codigo}`, {
              carrera: curso.carrera,
              aprobado_en: curso.aprobado_en
            });
          } catch (error) {
            console.error(`Error al actualizar curso ${curso.curso_codigo}:`, error);
          }
        }
        
        // Agregar nuevos cursos con POST (solo curso_codigo y carrera)
        for (const curso of cursosAAgregar) {
          try {
            if (!curso.curso_codigo || !curso.carrera) {
              console.error(`Curso inválido:`, curso);
              continue;
            }
            const response = await axios.post(`/api/usuario/${userIdParaUsar}/historial`, {
              curso_codigo: curso.curso_codigo,
              carrera: curso.carrera
            });
            console.log(`Curso ${curso.curso_codigo} agregado exitosamente:`, response.data);
          } catch (error) {
            if (axios.isAxiosError(error)) {
              console.error(`Error al agregar curso ${curso.curso_codigo}:`, {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
              });
            } else {
              console.error(`Error al agregar curso ${curso.curso_codigo}:`, error);
            }
          }
        }
        
        // Eliminar cursos removidos
        for (const curso of cursosAEliminar) {
          try {
            await axios.delete(`/api/usuario/${userIdParaUsar}/historial/${curso.curso_codigo}?carrera=${encodeURIComponent(curso.carrera)}`);
          } catch (error) {
            console.error(`Error al eliminar curso ${curso.curso_codigo}:`, error);
          }
        }
      }
      
      // Recargar historial completo desde el backend
      const historialResponse = await axios.get(historialUrl);
      if (historialResponse.data) {
        const cursos = historialResponse.data.cursos || [];
        setHistorial(cursos);
        setHistorialOriginal(cursos); // Actualizar historial original
        
        // Actualizar créditos totales del usuario
        const totalCreditos = historialResponse.data.total_creditos || 0;
        if (usuario) {
          const usuarioActualizado = {
            ...usuario,
            creditos_totales: totalCreditos
          };
          setUsuario(usuarioActualizado);
          localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
          
          // Actualizar créditos totales en el backend
          try {
            await axios.put(`/api/usuario/${userIdParaUsar}`, {
              creditos_totales: totalCreditos
            });
          } catch (error) {
            console.error("Error al actualizar créditos totales:", error);
            // No bloquear el flujo si falla la actualización de créditos
          }
        }
      }
      
      toast.success("Cambios guardados exitosamente");
    } catch (error) {
      console.error("Error al guardar cambios:", error);
      toast.error("Error al guardar cambios. Por favor, intenta nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const generarPlan = async () => {
    setLoading(true);
    try {
      // Extraer códigos del historial (nuevo formato con curso_codigo)
      const codigos = historial.map(h => h.curso_codigo);
      
      // Usar carrera del usuario si está logueado, o la seleccionada (carrera es obligatoria)
      const carreraParaPlanificar = usuario?.carrera || carreraSeleccionada;
      
      if (!carreraParaPlanificar) {
        toast.error("Debes seleccionar una carrera para generar el plan");
        setLoading(false);
        return;
      }
      
      console.log("Enviando datos al backend:", {
        historial: codigos,
        max_creditos: maxCreditos[0],
        carrera: carreraParaPlanificar
      });

      const res = await axios.post('/api/planificar', {
        historial: codigos,
        max_creditos: maxCreditos[0],
        carrera: carreraParaPlanificar
      });

      console.log("Respuesta recibida:", res.data); 
      setRecomendados(res.data.recomendacion_optima || []);
      setDisponibles(res.data.cursos_disponibles || []);

    } catch (error: unknown) { 
      console.error("ERROR DETALLADO:", error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("Datos del error:", error.response.data);
          console.error("Status:", error.response.status);
          toast.error("Error del Servidor", {
            description: JSON.stringify(error.response.data),
          });
        } else if (error.request) {
          console.error("No hubo respuesta del servidor.");
          toast.error("Error de conexión", {
            description: "El backend no responde. ¿Está encendido uvicorn?",
          });
        } else {
          console.error("Error al configurar la petición:", error.message);
        }
      } else {
        console.error("Error desconocido:", error);
      }
    } finally {
      setLoading(false);
    }
  };

  // No bloquear la UI - el auth es opcional, solo para guardar datos del usuario
  // El estado user se establece en el useEffect principal, eliminando llamadas redundantes

  return (
    <main className="min-h-screen bg-slate-50/50 p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 border-b pb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-xl">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">UPC Planner IA</h1>
              <p className="text-muted-foreground text-sm">Complejidad Algoritmica</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/malla">
              <Button variant="outline" className="gap-2">
                <Network className="w-4 h-4" />
                Ver Malla
              </Button>
            </Link>
            {user ? (
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setUser(null);
                  router.refresh();
                }}
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </Button>
            ) : (
              <Link href="/login">
                <Button variant="outline" className="gap-2">
                  Iniciar Sesión
                </Button>
              </Link>
            )}
          </div>
        </header>

        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Información del Estudiante
              </CardTitle>
              {usuario && !editandoInfo ? (
                <Button variant="outline" size="sm" onClick={() => {
                  setEditandoInfo(true);
                  setInfoEditada({
                    codigo_alumno: usuario.codigo_alumno || '',
                    carrera: usuario.carrera || ''
                  });
                }}>
                  Editar
                </Button>
              ) : usuario && editandoInfo ? (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditandoInfo(false);
                  }}>
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={async () => {
                    // Guardar cambios en el backend
                    if (!usuario?.id) {
                      toast.error("No se pudo obtener la información del usuario. Por favor, recarga la página.");
                      return;
                    }
                    
                    try {
                      await axios.put(`/api/usuario/${usuario.id}`, {
                        codigo_alumno: infoEditada.codigo_alumno,
                        carrera: infoEditada.carrera
                      });
                      setUsuario({
                        ...usuario,
                        codigo_alumno: infoEditada.codigo_alumno,
                        carrera: infoEditada.carrera
                      });
                      setCarreraSeleccionada(infoEditada.carrera);
                      setEditandoInfo(false);
                      toast.success("Información actualizada correctamente");
                    } catch (error) {
                      console.error("Error al actualizar usuario:", error);
                      toast.error("Error al actualizar la información");
                    }
                  }}>
                    Guardar
                  </Button>
                </div>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Código de Alumno</Label>
                {usuario ? (
                  editandoInfo ? (
                    <Input
                      className="mt-1 font-mono"
                      value={infoEditada.codigo_alumno}
                      onChange={(e) => setInfoEditada({...infoEditada, codigo_alumno: e.target.value})}
                      placeholder="Código de Alumno"
                    />
                  ) : (
                    <p className="font-semibold font-mono">{usuario.codigo_alumno || '—'}</p>
                  )
                ) : (
                  <p className="font-semibold font-mono text-muted-foreground">Cargando...</p>
                )}
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Carrera</Label>
                {usuario ? (
                  editandoInfo ? (
                    <Select
                      value={infoEditada.carrera}
                      onValueChange={(value) => setInfoEditada({...infoEditada, carrera: value})}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecciona una carrera" />
                      </SelectTrigger>
                      <SelectContent>
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
                  ) : (
                    <p className="font-semibold">{usuario.carrera || '—'}</p>
                  )
                ) : (
                  <p className="font-semibold text-muted-foreground">Cargando...</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Créditos Totales Aprobados</p>
                {usuario ? (
                  <p className="font-semibold">{usuario.creditos_totales ?? 0} créditos</p>
                ) : (
                  <p className="font-semibold text-muted-foreground">Cargando...</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Selección de Carrera e Historial Académico */}
        <Card className="border-primary/20 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Historial Académico
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Carrera (Obligatorio)</Label>
              <Select
                value={carreraSeleccionada}
                onValueChange={(value) => {
                  setCarreraSeleccionada(value);
                  localStorage.setItem('carrera', value);
                  
                  axios.get(`/api/cursos?carrera=${encodeURIComponent(value)}`)
                    .then(res => {
                      const cursosData = res.data;
                      let cursosArray: { codigo?: string; id?: string; value?: string; nombre?: string; label?: string; carrera?: string }[] = [];
                      
                      if (Array.isArray(cursosData)) {
                        cursosArray = cursosData;
                      } else if (cursosData && typeof cursosData === 'object') {
                        cursosArray = Array.isArray(cursosData.cursos) ? cursosData.cursos : 
                                     Array.isArray(cursosData.data) ? cursosData.data : [];
                      }
                      
                      const cursosFiltradosPorCarrera = cursosArray.filter((curso: { carrera?: string }) => {
                        return curso.carrera === value;
                      });
                      
                      const catalogoTransformado = cursosFiltradosPorCarrera.map((curso) => {
                        const codigo = curso.codigo || curso.id || curso.value || '';
                        const carreraCurso = curso.carrera || value;
                        const pk = `${codigo}|${carreraCurso}`;
                        
                        return {
                          value: pk,
                          label: curso.nombre || curso.label || codigo,
                          codigo: codigo,
                          carrera: carreraCurso
                        };
                      });
                      
                      setCatalogo(catalogoTransformado);
                    })
                    .catch(err => {
                      console.error("Error al filtrar cursos por carrera:", err);
                      setCatalogo([]);
                    });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona una carrera" />
                </SelectTrigger>
                <SelectContent>
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
              <p className="text-xs text-muted-foreground">
                Selecciona una carrera para ver los cursos disponibles.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Agregar Curso</Label>
              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ciclo</Label>
                <Select
                  value={cicloSeleccionado}
                  onValueChange={setCicloSeleccionado}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un ciclo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 14 }, (_, i) => i + 1).map((ciclo) => (
                      <SelectItem key={ciclo} value={ciclo.toString()}>
                        Ciclo {ciclo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar curso aprobado..." 
                  className="pl-8"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
              
              {busqueda && (
                <Card className="absolute z-10 w-full mt-1 shadow-xl border-slate-200">
                  <ScrollArea className="h-[200px]">
                    <div className="p-1">
                      {cursosFiltrados.map((c) => (
                        <div 
                          key={c.value}
                          onClick={() => agregarCurso(c)}
                          className="flex items-center justify-between p-2 text-sm rounded-sm hover:bg-slate-100 cursor-pointer transition-colors"
                        >
                          <span>{c.label}</span>
                          <Plus className="w-3 h-3 text-muted-foreground"/>
                        </div>
                      ))}
                      {cursosFiltrados.length === 0 && (
                        <div className="p-3 text-xs text-center text-muted-foreground">No se encontraron cursos</div>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              )}
            </div>

            {user?.id && (
              <div className={`flex items-center justify-between p-3 rounded-md border ${
                hayCambios() 
                  ? 'bg-yellow-50 border-yellow-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}>
                {hayCambios() ? (
                  <>
                    <p className="text-sm text-yellow-800 font-medium">
                      Tienes cambios sin guardar
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setHistorial([...historialOriginal]);
                        }}
                        disabled={guardando}
                        size="sm"
                        variant="outline"
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={guardarCambios}
                        disabled={guardando}
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                      >
                        {guardando ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          "Guardar Cambios"
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Todos los cambios están guardados
                    </p>
                    <Button
                      onClick={guardarCambios}
                      disabled={guardando || !hayCambios()}
                      size="sm"
                      variant="outline"
                    >
                      {guardando ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Guardando...
                        </>
                      ) : (
                        "Guardar Cambios"
                      )}
                    </Button>
                  </>
                )}
              </div>
            )}

            <ScrollArea className="h-[300px] w-full rounded-md border">
              {historial.length === 0 ? (
                <div className="p-8 text-sm text-muted-foreground flex flex-col items-center justify-center gap-2 opacity-50">
                  <BookOpen className="w-8 h-8"/>
                  <span>Sin historial académico</span>
                </div>
              ) : (
                <div className="p-4">
                  {Object.entries(
                    historial.reduce((acc: Record<number, CursoAprobado[]>, curso) => {
                      const nivel = curso.nivel || 0;
                      if (!acc[nivel]) acc[nivel] = [];
                      acc[nivel].push(curso);
                      return acc;
                    }, {})
                  )
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([nivel, cursos]) => (
                      <div key={nivel} className="mb-6 last:mb-0">
                        <h4 className="text-sm font-semibold text-primary mb-2 pb-1 border-b">
                          Ciclo {nivel}
                        </h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[100px]">Código</TableHead>
                              <TableHead>Nombre</TableHead>
                              <TableHead className="text-center">Créditos</TableHead>
                              <TableHead className="text-center">Aprobado en</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cursos.sort((a, b) => (a.curso_codigo || '').localeCompare(b.curso_codigo || '')).map((curso) => (
                              <TableRow key={`${curso.curso_codigo}|${curso.carrera}`}>
                                <TableCell className="font-mono text-sm">{curso.curso_codigo}</TableCell>
                                <TableCell>{curso.nombre}</TableCell>
                                <TableCell className="text-center">{curso.creditos}</TableCell>
                                <TableCell className="text-center">
                                  {curso.aprobado_en 
                                    ? new Date(curso.aprobado_en).toLocaleDateString('es-PE', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit'
                                      })
                                    : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => eliminarCurso(curso)}
                                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea>

            <Button 
              className="w-full mt-4" 
              size="lg" 
              onClick={generarPlan} 
              disabled={loading}
            >
              {loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Flame className="mr-2 h-4 w-4" />}
              {loading ? "Calculando..." : "Generar Ruta Óptima"}
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpen className="w-5 h-5 text-primary"/> Configuración
                </CardTitle>
                <CardDescription>Define tus parámetros de matrícula.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label>Límite de Créditos</Label>
                    <Badge variant="secondary" className="font-mono text-base">
                      {maxCreditos[0]}
                    </Badge>
                  </div>
                  <Slider 
                    value={maxCreditos} 
                    onValueChange={setMaxCreditos} 
                    max={27} min={1} step={1} 
                  />
                  <p className="text-xs text-muted-foreground text-right">Mín: 1 - Máx: 27</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8">
            <Tabs defaultValue="greedy" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="greedy">Recomendación Greedy</TabsTrigger>
                <TabsTrigger value="todos">Todos Disponibles</TabsTrigger>
              </TabsList>
              
              <TabsContent value="greedy" className="mt-4">
                <Card className="border-primary/20 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <CardHeader>
                    <CardTitle className="text-primary flex items-center gap-2">
                      <Flame className="fill-primary" /> Ruta Crítica Sugerida
                    </CardTitle>
                    <CardDescription>
                      Optimizada para desbloquear la mayor cantidad de cursos futuros.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recomendados.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Código</TableHead>
                            <TableHead>Asignatura</TableHead>
                            <TableHead className="text-center">Créditos</TableHead>
                            <TableHead className="text-right">Impacto Futuro</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {recomendados.map((curso) => (
                            <TableRow key={curso.id}>
                              <TableCell className="font-mono font-medium text-primary">
                                {curso.id}
                              </TableCell>
                              <TableCell>{curso.nombre}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline">{curso.creditos}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge className="bg-orange-500 hover:bg-orange-600">
                                  +{curso.impacto}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                        <Search className="w-10 h-10 mb-3 opacity-20" />
                        <p>Ejecuta el algoritmo para ver resultados</p>
                      </div>
                    )}
                  </CardContent>
                  {recomendados.length > 0 && (
                    <CardFooter className="bg-slate-50 border-t p-4 flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Algoritmo: <span className="font-semibold text-slate-900">Voraz (Greedy)</span></span>
                      <div className="flex items-center gap-2">
                        <span>Carga Total:</span>
                        <Badge variant="secondary" className="text-lg">
                          {recomendados.reduce((acc, curr) => acc + curr.creditos, 0)} / {maxCreditos[0]}
                        </Badge>
                      </div>
                    </CardFooter>
                  )}
                </Card>
              </TabsContent>

              <TabsContent value="todos" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Menú Completo</CardTitle>
                    <CardDescription>
                      Todos los cursos cuyos requisitos cumples actualmente ({disponibles.length}).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px] w-full pr-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {disponibles.map((curso) => (
                          <div key={curso.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                            <div className="space-y-1">
                              <p className="text-sm font-medium leading-none">{curso.nombre}</p>
                              <p className="text-xs text-muted-foreground font-mono">{curso.id}</p>
                            </div>
                            <Badge variant="secondary">{curso.creditos} cr</Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

        </div>
      </div>
    </main>
  );
}