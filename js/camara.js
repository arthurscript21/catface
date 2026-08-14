import com.github.sarxos.webcam.Webcam;
import com.github.sarxos.webcam.WebcamPanel;
import com.github.sarxos.webcam.WebcamResolution;

import javax.imageio.ImageIO;
import javax.swing.*;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Demo simple: abre la cámara por defecto del computador,
 * muestra el video en vivo en una ventana, y permite
 * guardar una foto (PNG) con un botón.
 */
public class CameraApp {

    public static void main(String[] args) {

        // 1) Tomamos la cámara por defecto del sistema
        Webcam webcam = Webcam.getDefault();
        if (webcam == null) {
            System.out.println("No se encontró ninguna cámara conectada.");
            return;
        }
        webcam.setViewSize(WebcamResolution.VGA.getSize()); // 640x480

        // 2) Panel que dibuja el video en vivo
        WebcamPanel panel = new WebcamPanel(webcam);
        panel.setFPSDisplayed(true);
        panel.setMirrored(true); // efecto espejo, como una selfie cam

        // 3) Botón para capturar una foto
        JButton captureButton = new JButton("Capturar foto");
        captureButton.addActionListener(e -> guardarFoto(webcam));

        // 4) Ventana principal
        JFrame frame = new JFrame("Cámara - demo");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setLayout(new BorderLayout());
        frame.add(panel, BorderLayout.CENTER);
        frame.add(captureButton, BorderLayout.SOUTH);
        frame.pack();
        frame.setLocationRelativeTo(null);
        frame.setVisible(true);
    }

    private static void guardarFoto(Webcam webcam) {
        BufferedImage imagen = webcam.getImage();
        if (imagen == null) return;

        String marcaDeTiempo = LocalDateTime.now()
                .format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        File archivo = new File("captura_" + marcaDeTiempo + ".png");

        try {
            ImageIO.write(imagen, "PNG", archivo);
            System.out.println("Foto guardada en: " + archivo.getAbsolutePath());
        } catch (IOException ex) {
            ex.printStackTrace();
        }
    }
}